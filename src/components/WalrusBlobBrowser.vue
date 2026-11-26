<script setup lang="ts">
// Pick an icon from the Walrus blobs an address owns (the connected wallet's by default). Only image blobs preview.
// Vue, the shared UI components, the helpers, the client's blob type and this app's own modules.
import { ref, shallowRef, watch } from 'vue'
import { UiButton, UiEmptyState, UiLiveStatus, UiNotice, UiTextField } from '@meddleware/ui'
import { createGeneration, errorMessage, formatBytes, safeHref } from '@meddleware/web-utils'
import type { OwnedBlob } from '@meddleware/walrus-storage-client'
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url'
import { WALRUS_RPC_URLS, type WalrusNetwork } from '../config.js'
import { getReadClient, useWallet } from '../wallet.js'

// The panel's inputs and event.
// The component's inputs and event.
const props = defineProps<{ network: WalrusNetwork; connected: boolean }>()
const emit = defineEmits<{ (e: 'select', url: string): void }>()

// The shared wallet account; the address field starts as the wallet's own address and can be changed to browse another address's blobs (public chain data).
const { account } = useWallet()

// The address to browse starts as the connected wallet's.
const addressInput = ref(account.value?.address ?? '')
watch(
  () => account.value?.address,
  (addr) => {
    if (addr && !addressInput.value) addressInput.value = addr
  },
)

/** An owned blob with the URL it is served at. */
interface BlobItem extends OwnedBlob {
  url: string
}

// The listed blobs, the load state, the chosen blob and whether a load has finished.
// The listed blobs, the load state and the chosen blob.
const blobs = shallowRef<BlobItem[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const selected = ref('')
const hasLoaded = ref(false)
/** Blobs whose image did not load (not every blob is an image). */
const broken = ref<ReadonlySet<string>>(new Set())
// An older load never replaces a newer one (the address or the network can change while one is in flight).
// An older load never replaces a newer one.
const generation = createGeneration()

/** load(): list the blobs an address owns, with the URL each is served at; a slower, older load never replaces a newer one. */
/** load(): list the blobs an address owns; a slower, older load never replaces a newer one. */
async function load(): Promise<void> {
  // Use the typed address, or the connected wallet's.
  const addr = addressInput.value.trim() || account.value?.address
  if (!addr) {
    loadError.value = 'Enter an address or connect your wallet.'
    return
  }
  // Mark this load as the newest.
  const current = generation.begin()
  loading.value = true
  loadError.value = null
  blobs.value = []
  broken.value = new Set()
  hasLoaded.value = false
  try {
    // The Walrus client library is loaded only now (it is heavy).
    const { createWalrusClient, walrusBlobUrl, fetchOwnedWalrusBlobs } = await import('@meddleware/walrus-storage-client')
    const client = createWalrusClient({ network: props.network, rpcUrl: WALRUS_RPC_URLS[props.network], wasmUrl: walrusWasmUrl })
    // Read the address's Blob objects from the chain.
    const raw = await fetchOwnedWalrusBlobs(getReadClient(props.network), client, addr)
    if (!current()) return
    blobs.value = raw.map((b) => ({ ...b, url: walrusBlobUrl(props.network, b.blobId) }))
    hasLoaded.value = true
  } catch (e) {
    if (current()) loadError.value = errorMessage(e)
  } finally {
    if (current()) loading.value = false
  }
}

/** selectBlob(item): choose a blob; its URL goes to the form. */
function selectBlob(item: BlobItem): void {
  selected.value = item.blobId
  emit('select', item.url)
}

/** markBroken(blobId): remember that a blob's image did not load (not every blob is an image). */
function markBroken(blobId: string): void {
  broken.value = new Set(broken.value).add(blobId)
}
</script>

<template>
  <UiTextField id="blob-address" v-model="addressInput" label="Wallet address to browse" placeholder="0x… or leave blank for your wallet" />
  <p>
    <!-- Load the address's blobs. -->
    <UiButton variant="secondary" :busy="loading" :disabled="!connected && !addressInput.trim()" @click="load">Load</UiButton>
  </p>
  <p>Browse Walrus blobs owned by this address. Only image blobs show a preview.</p>

  <!-- A failed load is shown. -->
  <UiNotice v-if="loadError" type="error" :message="loadError" />
  <!-- The Blobs live status. -->
  <UiLiveStatus label="Blobs" :message="loading ? 'Loading blobs…' : ''" />
  <!-- Nothing found at the address. -->
  <UiEmptyState v-if="hasLoaded && blobs.length === 0 && !loading">No Walrus blobs found at this address.</UiEmptyState>

  <!-- A list of toggle buttons (native keyboard behaviour); aria-pressed marks the chosen blob. -->
  <!-- The blobs as a grid of toggle buttons. -->
  <ul v-if="blobs.length > 0" class="grid" role="list" aria-label="Walrus blobs">
    <!-- One toggle button per blob. -->
    <li v-for="b in blobs" :key="b.objectId">
      <button type="button" class="thumb" :class="{ selected: selected === b.blobId }" :aria-pressed="selected === b.blobId" @click="selectBlob(b)">
        <!-- The image is loaded lazily from the aggregator; the address is made safe (http or https) first. -->
        <img v-if="!broken.has(b.blobId)" :src="safeHref(b.url)" :alt="`Blob ${b.blobId.slice(0, 8)}…`" loading="lazy" @error="markBroken(b.blobId)" />
        <span v-else class="no-image" aria-hidden="true">?</span>
        <span class="meta">{{ broken.has(b.blobId) ? `Blob ${b.blobId.slice(0, 8)}… · ` : '' }}{{ formatBytes(b.size) }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
/* A responsive grid of thumbnails. */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
  gap: var(--space-2xs);
  margin: 0;
  padding: 0;
  list-style: none;
}
/* Each thumbnail is a button with a border that follows the theme. */
.thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3xs);
  inline-size: 100%;
  padding: var(--space-3xs);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  font: inherit;
  cursor: pointer;
  overflow: hidden;
}
/* Hover and selection use the accent colour. */
.thumb:hover,
.thumb.selected {
  border-color: var(--accent);
}
.thumb.selected {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}
/* Images and placeholders are square and cropped to fit. */
.thumb img,
.no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-xs);
  background: var(--lift);
  color: var(--muted);
}
/* The caption is small, muted and wraps anywhere. */
.meta {
  max-inline-size: 100%;
  color: var(--muted);
  font-size: var(--font-size-xs);
  overflow-wrap: anywhere;
}
</style>
