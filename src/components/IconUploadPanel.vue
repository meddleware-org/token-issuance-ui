<script setup lang="ts">
// Uploading an icon to Walrus through an upload relay, and handing back the blob's URL. Browsers cannot write to Walrus directly, so the
// blob goes through the operator's relay (which may charge a small tip and be gated by an access pass) or the free public one. The upload
// itself is walrus-storage-client's `runBlobUpload`; the relay choice, the tip estimate and the pass check come from the kit.
// Created per network (the parent keys it by `network`), so the pass state and the relay hosts belong to one network for its lifetime.
// Vue, the shared UI components, the helpers, the Walrus kit and client, the token client's network type and this app's own modules.
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
import { ICON_EPOCHS, iconStorageLabel } from '../lib/walrus-constants.js'
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

// The panel's inputs and event.
const props = defineProps<{ network: Network; connected: boolean }>()
const emit = defineEmits<{ uploaded: [url: string] }>()

// The shared wallet account, and the Walrus network for the token's network (testnet unless mainnet).
// The shared wallet account.
const { account } = useWallet()
// A Walrus network is testnet or mainnet; this panel is only shown on those.
const walrusNet: WalrusNetwork = props.network === 'mainnet' ? 'mainnet' : 'testnet'

// NFT-gated relay access (inert when no gate is configured for this network). `useAccessGate` throws for a gate that is not the published
// deployment on `walrusNet`; `accessGateFor` only returns configs built by `relayGateConfig` (or null). The price and payees are read from
// the chain.
// Access-gate state for the relay (inert when no gate is configured for this network); the price and payees are read from the chain.
const accessGate = useAccessGate({ network: walrusNet, gate: accessGateFor(walrusNet), getClient: () => getReadClient(walrusNet) })
// The gated-upload helper (proof of the pass for the gated relay).
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

// The relay options and the selection model; whether the free relay is worth suggesting.
// The relay options and the selection model.
const relayOptions = computed(() => availableRelays.value.map((r) => ({ id: r.host, label: r.label })))
const relayModel = computed({
  get: () => selectedRelayHost.value,
  set: (host: string) => {
    selectedRelayHost.value = host
  },
})
// The free relay's host, and whether to suggest it.
const publicHost = computed(() => availableRelays.value.find((r) => r.isPublic)?.host)
const showFreeRelayTip = computed(() => availableRelays.value.length > 1 && selectedRelayHost.value !== publicHost.value)

// The panel's state: purchase and upload running, progress text, errors, the chosen file and whether the blob is permanent.
// The panel's state: purchase and upload running, progress, errors and the chosen file.
const purchasing = ref(false)
const uploading = ref(false)
const status = ref('')
const uploadError = ref<string | null>(null)
const fileName = ref('')
const permanent = ref(true)
// Set when the relay upload failed after the icon was registered (and paid for): retries on it.
// Set when the relay upload failed after the icon was registered (and paid for): a retry that does not pay again.
// Set when the upload failed after the icon was registered (and paid for): a retry that does not pay again.
const retryUpload = ref<(() => Promise<{ url: string }>) | null>(null)
const retrying = ref(false)
// The chosen file's bytes, and a guard so a slower file read never replaces a newer one.
// The chosen file's bytes, and a guard so a slower read never replaces a newer one.
let bytes: Uint8Array | null = null
const reading = createGeneration()

// The size limit and how long the icon is stored, as the person reads them.
// The size limit and the storage period, as the person reads them.
const maxSizeLabel = formatBytes(ICON_MAX_BYTES)
const storedFor = iconStorageLabel(walrusNet)

/** refreshAccess(): re-check pass ownership when a gate is configured and a wallet is connected. */
async function refreshAccess(): Promise<void> {
  if (accessGate.gateConfigured && account.value) await accessGate.checkOwnership(account.value.address)
}

// On first show: check the operator relay's health and the pass.
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

/** onFile(file): validate the chosen image, then read it into memory (never sent anywhere until Upload). */
/** onFile(file): validate the image, then read it into memory (it is sent only when Upload is pressed). */
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

/** done(url): hand the blob's URL to the form. */
function done(url: string): void {
  emit('uploaded', url)
  retryUpload.value = null
  status.value = 'Uploaded — the URL is filled in.'
}

/** retryOnRegistration(): retry the relay upload for an icon that is already registered and paid for. */
/** retryOnRegistration(): retry the relay upload without paying again. */
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

/** upload(): register the blob, send it through the relay and hand back its URL; a failure after payment keeps a retry. */
/** upload(): register, send through the relay and certify; keep a retry if it fails after payment. */
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
    // The wallet executor for the token's network.
    const executor = await buildDeployExecutor(props.network)
    // Progress reports go to the live status line.
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
    // Run the shared upload flow: register, send through the relay, certify.
    // Run the shared upload flow.
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
    <!-- Upload is disabled until a wallet is connected, a file is chosen and a relay is available. -->
    <UiButton :busy="uploading" :disabled="!connected || !fileName || availableRelays.length === 0" @click="upload">Upload to Walrus</UiButton>
  </p>

  <!-- A permanent blob cannot be deleted; a deletable one can be removed early to reclaim storage fees. -->
  <UiCheckField v-model="permanent" label="Permanent blob" hint="cannot be deleted" />
  <p>
    A permanent blob cannot be deleted once registered, even within its storage period. Deletable blobs can be removed early by the owner to
    reclaim unused storage fees (WAL). Permanent is the safer default for a token icon. Either way the blob is stored only for the period
    given below.
  </p>

  <template v-if="fileName && availableRelays.length > 1">
    <!-- The relay choice appears only when there is more than one. -->
    <UiSegmentedControl v-model="relayModel" :options="relayOptions" label="Upload relay" layout="wrap" />
    <p>
      Browsers can't write to Walrus directly, so the blob is sent through an upload relay. The public relay is free. The Meddleware
      relay supports this app and may charge a small SUI tip per upload. Both store the identical blob — pick whichever you
      prefer.
    </p>
  </template>

  <!-- The estimated cost, when it can be priced. -->
  <UiNotice v-if="fileName && estimatedCost"><strong>Estimated cost:</strong> {{ estimatedCost.label }}</UiNotice>
  <!-- The Upload relay live status. -->
  <!-- The relay check is announced politely. -->
  <UiLiveStatus label="Upload relay" :message="fileName && connected && relayPending ? 'Checking the upload relay…' : ''" />

  <!-- NFT-gated relay: the operator relay is live but this wallet lacks the access pass. While the operator relay is up it is the only relay
       offered, so uploading needs a pass. -->
  <template v-if="fileName && purchaseAccessAvailable">
    <!-- The purchase prompt for a gated relay. -->
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

  <!-- Suggest the free relay when the operator's is selected. -->
  <UiNotice v-if="showFreeRelayTip">Tip: select the public relay above to avoid the relay fee.</UiNotice>

  <UiNotice>
    Max {{ maxSizeLabel }} · PNG/JPEG/WebP/SVG. Requires <strong>WAL</strong> (storage) and <strong>SUI</strong> (network fee + relay fee) in your
    wallet; two approvals. Stored for {{ storedFor }}; its owner can extend the storage before then.
  </UiNotice>
  <!-- The Upload progress live status. -->
  <!-- Progress is announced politely. -->
  <UiLiveStatus label="Upload progress" :message="status" />
  <!-- The last error. -->
  <UiNotice v-if="uploadError" type="error" :message="uploadError" />
  <!-- After a failure that came after payment: retry without paying again. -->
  <UiNotice v-if="retryUpload">
    The icon is registered and paid for.
    <UiButton variant="link" :busy="retrying" @click="retryOnRegistration">Retry upload</UiButton> (no second payment).
  </UiNotice>
</template>
