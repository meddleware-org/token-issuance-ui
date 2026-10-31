<script setup lang="ts">
// Uploading an icon to Walrus through an upload relay, and handing back the blob's URL. Browsers cannot write to Walrus directly, so the
// blob goes through the operator's relay (which may charge a small tip and be gated by an access pass) or the free public one. The upload
// itself is walrus-storage-client's `runBlobUpload`; the relay choice, the tip estimate and the pass check come from the kit.
// Created per network (the parent keys it by `network`), so the pass state and the relay hosts belong to one network for its lifetime.
import { computed, onMounted, ref, watch } from 'vue'
import {
  UiButton,
  UiCheckField,
  UiFileField,
  UiLiveStatus,
  UiNotice,
  UiSegmentedControl,
} from '@meddleware/ui'
import { createGeneration, errorMessage, formatBytes } from '@meddleware/web-utils'
import { AccessGateCta, PUBLIC_WALRUS_RELAY_HOSTS, useAccessGate, useGatedUpload, useWalrusRelay } from '@meddleware/walrus-storage-kit'
import { getUploadRetry, runBlobUpload } from '@meddleware/walrus-storage-client/flow'
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url'
import type { TokenNetwork as Network } from '@meddleware/token-issuance-client'
import { buildDeployExecutor } from '../lib/deployExecutor.js'
import { ICON_EPOCHS } from '../lib/walrus-constants.js'
import {
  ICON_MAX_BYTES,
  WALRUS_MAX_TIP_MIST,
  WALRUS_RELAY_HOSTS,
  WALRUS_RPC_URLS,
  accessGateFor,
  validateIconFile,
  type WalrusNetwork,
} from '../config.js'
import { getReadClient, signPersonalMessage, useWallet } from '../wallet.js'

const props = defineProps<{ network: Network; connected: boolean }>()
const emit = defineEmits<{ uploaded: [url: string] }>()

const { account } = useWallet()
// A Walrus network is testnet or mainnet; this panel is only shown on those.
const walrusNet: WalrusNetwork = props.network === 'mainnet' ? 'mainnet' : 'testnet'

// NFT-gated relay access (inert when no gate is configured for this network). `useAccessGate` throws for a gate that is not the published
// deployment on `walrusNet`; `accessGateFor` only returns configs built by `relayGateConfig` (or null). The price and payees are read from
// the chain.
const accessGate = useAccessGate({ network: walrusNet, gate: accessGateFor(walrusNet), getClient: () => getReadClient(walrusNet) })
const { accessFor } = useGatedUpload(accessGate)

const {
  selectedRelayHost,
  availableRelays,
  relayPending,
  purchaseAccessAvailable,
  estimatedCost,
  fileSizeBytes,
  checkOperatorRelayHealth,
} = useWalrusRelay(
  { operator: WALRUS_RELAY_HOSTS[walrusNet], public: PUBLIC_WALRUS_RELAY_HOSTS[walrusNet] },
  { gateConfigured: accessGate.gateConfigured, hasAccess: accessGate.hasAccess },
)

const relayOptions = computed(() => availableRelays.value.map((r) => ({ id: r.host, label: r.label })))
const relayModel = computed({
  get: () => selectedRelayHost.value,
  set: (host: string) => {
    selectedRelayHost.value = host
  },
})
const publicHost = computed(() => availableRelays.value.find((r) => r.isPublic)?.host)
const showFreeRelayTip = computed(() => availableRelays.value.length > 1 && selectedRelayHost.value !== publicHost.value)

const purchasing = ref(false)
const uploading = ref(false)
const status = ref('')
const uploadError = ref<string | null>(null)
const fileName = ref('')
const permanent = ref(true)
// Set when the relay upload failed after the icon was registered (and paid for): retries on it.
const retryUpload = ref<(() => Promise<{ url: string }>) | null>(null)
const retrying = ref(false)
let bytes: Uint8Array | null = null
const reading = createGeneration()

const maxSizeLabel = formatBytes(ICON_MAX_BYTES)
const ICON_YEARS = Math.round(ICON_EPOCHS / 26)

async function refreshAccess(): Promise<void> {
  if (accessGate.gateConfigured && account.value) await accessGate.checkOwnership(account.value.address)
}

onMounted(() => {
  checkOperatorRelayHealth()
  void refreshAccess()
})

// Re-check NFT ownership whenever the connected account changes.
watch(
  () => account.value?.address,
  () => {
    accessGate.reset() // forget the previous wallet's access, uses and held pass
    void refreshAccess()
  },
)

/** Buy relay access (mints the gate NFT to the wallet), then re-check ownership. */
async function purchaseAccess(): Promise<void> {
  if (!account.value) {
    uploadError.value = 'Connect your wallet first.'
    return
  }
  purchasing.value = true
  uploadError.value = null
  try {
    await accessGate.purchase(await buildDeployExecutor(props.network), account.value.address)
  } catch {
    // The reason is published in `purchaseError` and shown by the prompt.
  } finally {
    purchasing.value = false
  }
}

async function onFile(file: File | null): Promise<void> {
  uploadError.value = null
  bytes = null
  fileName.value = ''
  const current = reading.begin()
  if (!file) return
  const invalid = validateIconFile(file)
  if (invalid) {
    uploadError.value = invalid
    return
  }
  fileName.value = file.name
  fileSizeBytes.value = file.size
  const read = new Uint8Array(await file.arrayBuffer())
  if (current()) bytes = read
}

function done(url: string): void {
  emit('uploaded', url)
  retryUpload.value = null
  status.value = 'Uploaded — the URL is filled in.'
}

async function retryOnRegistration(): Promise<void> {
  const retry = retryUpload.value
  if (!retry || retrying.value) return
  retrying.value = true
  uploadError.value = null
  try {
    done((await retry()).url)
  } catch (e) {
    uploadError.value = errorMessage(e)
    retryUpload.value = getUploadRetry<{ url: string }>(e)
  } finally {
    retrying.value = false
    void refreshAccess()
  }
}

async function upload(): Promise<void> {
  if (!bytes) {
    uploadError.value = 'Choose an image first.'
    return
  }
  if (!account.value) {
    uploadError.value = 'Connect your wallet first.'
    return
  }
  const address = account.value.address
  uploading.value = true
  uploadError.value = null
  try {
    const executor = await buildDeployExecutor(props.network)
    const onStatus = (p: { detail?: string }): void => {
      status.value = p.detail ?? ''
    }
    // The gated operator relay needs proof of an access pass; a single-use consume is persisted before the upload and reused on a retry.
    const access = accessFor({
      relayHost: selectedRelayHost.value,
      publicHost: publicHost.value,
      address,
      network: walrusNet,
      executor,
      sign: signPersonalMessage,
      onStatus,
    })
    const result = await runBlobUpload({
      bytes,
      network: walrusNet,
      relayHost: selectedRelayHost.value,
      address,
      rpcUrl: WALRUS_RPC_URLS[walrusNet],
      wasmUrl: walrusWasmUrl,
      maxTipMist: Number(WALRUS_MAX_TIP_MIST),
      epochs: ICON_EPOCHS,
      deletable: !permanent.value,
      executor,
      suiClient: getReadClient(props.network),
      access,
      onStatus,
    })
    done(result.url)
  } catch (e) {
    uploadError.value = errorMessage(e)
    retryUpload.value = getUploadRetry<{ url: string }>(e)
    status.value = ''
  } finally {
    uploading.value = false
    void refreshAccess() // uses remaining may have changed
  }
}
</script>

<template>
  <UiFileField id="walrus-file" label="Image to upload to Walrus" accept="image/*" hint="PNG, JPEG, WebP or SVG" @select="onFile" />
  <!-- No relay is offered while the operator relay's health or pass check is pending, or while a gated relay is up and this wallet has no
       pass: upload is blocked then (walrus-storage-kit useWalrusRelay policy). -->
  <p>
    <UiButton :busy="uploading" :disabled="!connected || !fileName || availableRelays.length === 0" @click="upload">Upload to Walrus</UiButton>
  </p>

  <UiCheckField v-model="permanent" label="Permanent blob" hint="cannot be deleted" />
  <p>
    A permanent blob cannot be deleted once registered, even within its storage period. Deletable blobs can be removed early by the owner to
    reclaim unused storage fees (WAL). Permanent is the safer default for a token icon that should remain available indefinitely.
  </p>

  <template v-if="fileName && availableRelays.length > 1">
    <UiSegmentedControl v-model="relayModel" :options="relayOptions" label="Upload relay" layout="wrap" />
    <p>
      Browsers can't write to Walrus directly, so the blob is sent through an upload relay. The <b>public</b> relay is free; the
      <b>operator</b> relay is run by this app and may charge a small SUI tip per upload. Both store the identical blob — pick whichever you
      prefer.
    </p>
  </template>

  <UiNotice v-if="fileName && estimatedCost"><strong>Estimated cost:</strong> {{ estimatedCost.label }}</UiNotice>
  <UiLiveStatus label="Upload relay" :message="fileName && connected && relayPending ? 'Checking the upload relay…' : ''" />

  <!-- NFT-gated relay: the operator relay is live but this wallet lacks the access pass. While the operator relay is up it is the only relay
       offered, so uploading needs a pass. -->
  <template v-if="fileName && purchaseAccessAvailable">
    <AccessGateCta
      :gate-configured="accessGate.gateConfigured"
      :has-access="accessGate.hasAccess.value"
      :busy="purchasing"
      :terms="accessGate.terms.value"
      :terms-error="accessGate.termsError.value"
      :purchase-error="accessGate.purchaseError.value"
      @purchase="purchaseAccess"
    />
    <UiButton v-if="accessGate.termsError.value && !accessGate.termsLoading.value" variant="secondary" @click="accessGate.loadTerms()">
      Read the price again
    </UiButton>
  </template>

  <UiNotice v-if="showFreeRelayTip">Tip: select the public relay above to avoid the relay fee.</UiNotice>

  <UiNotice>
    Max {{ maxSizeLabel }} · PNG/JPEG/WebP/SVG. Requires <strong>WAL</strong> (storage) and <strong>SUI</strong> (gas + relay fee) in your
    wallet; two approvals. Stored for ~{{ ICON_YEARS }} years.
  </UiNotice>
  <UiLiveStatus label="Upload progress" :message="status" />
  <UiNotice v-if="uploadError" type="error" :message="uploadError" />
  <UiNotice v-if="retryUpload">
    The icon is registered and paid for.
    <UiButton variant="link" :busy="retrying" @click="retryOnRegistration">Retry upload</UiButton> (no second payment).
  </UiNotice>
</template>
