<script setup lang="ts">
// Pick an icon from the Walrus blobs an address owns (the connected wallet's by default). Only image blobs preview.
import { ref, shallowRef, watch } from 'vue'
import { UiButton, UiEmptyState, UiLiveStatus, UiNotice, UiTextField } from '@meddleware/ui'
import { createGeneration, errorMessage, formatBytes, safeHref } from '@meddleware/web-utils'
import type { OwnedBlob } from '@meddleware/walrus-storage-client'
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url'
import { WALRUS_RPC_URLS, type WalrusNetwork } from '../config.js'
import { getReadClient, useWallet } from '../wallet.js'

const props = defineProps<{ network: WalrusNetwork; connected: boolean }>()
const emit = defineEmits<{ (e: 'select', url: string): void }>()

const { account } = useWallet()

const addressInput = ref(account.value?.address ?? '')
watch(
  () => account.value?.address,
  (addr) => {
    if (addr && !addressInput.value) addressInput.value = addr
  },
)

interface BlobItem extends OwnedBlob {
  url: string
}

const blobs = shallowRef<BlobItem[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const selected = ref('')
const hasLoaded = ref(false)
/** Blobs whose image did not load (not every blob is an image). */
const broken = ref<ReadonlySet<string>>(new Set())
// An older load never replaces a newer one (the address or the network can change while one is in flight).
const generation = createGeneration()

async function load(): Promise<void> {
  const addr = addressInput.value.trim() || account.value?.address
  if (!addr) {
    loadError.value = 'Enter an address or connect your wallet.'
    return
  }
  const current = generation.begin()
  loading.value = true
  loadError.value = null
  blobs.value = []
  broken.value = new Set()
  hasLoaded.value = false
  try {
    const { createWalrusClient, walrusBlobUrl, fetchOwnedWalrusBlobs } = await import('@meddleware/walrus-storage-client')
    const client = createWalrusClient({ network: props.network, rpcUrl: WALRUS_RPC_URLS[props.network], wasmUrl: walrusWasmUrl })
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

function selectBlob(item: BlobItem): void {
  selected.value = item.blobId
  emit('select', item.url)
}

function markBroken(blobId: string): void {
  broken.value = new Set(broken.value).add(blobId)
}
</script>

<template>
  <UiTextField id="blob-address" v-model="addressInput" label="Wallet address to browse" placeholder="0x… or leave blank for your wallet" />
  <p>
    <UiButton variant="secondary" :busy="loading" :disabled="!connected && !addressInput.trim()" @click="load">Load</UiButton>
  </p>
  <p>Browse Walrus blobs owned by this address. Only image blobs show a preview.</p>

  <UiNotice v-if="loadError" type="error" :message="loadError" />
  <UiLiveStatus label="Blobs" :message="loading ? 'Loading blobs…' : ''" />
  <UiEmptyState v-if="hasLoaded && blobs.length === 0 && !loading">No Walrus blobs found at this address.</UiEmptyState>

  <!-- A list of toggle buttons (native keyboard behaviour); aria-pressed marks the chosen blob. -->
  <ul v-if="blobs.length > 0" class="grid" role="list" aria-label="Walrus blobs">
    <li v-for="b in blobs" :key="b.objectId">
      <button type="button" class="thumb" :class="{ selected: selected === b.blobId }" :aria-pressed="selected === b.blobId" @click="selectBlob(b)">
        <img v-if="!broken.has(b.blobId)" :src="safeHref(b.url)" :alt="`Blob ${b.blobId.slice(0, 8)}…`" loading="lazy" @error="markBroken(b.blobId)" />
        <span v-else class="no-image" aria-hidden="true">?</span>
        <span class="meta">{{ broken.has(b.blobId) ? `Blob ${b.blobId.slice(0, 8)}… · ` : '' }}{{ formatBytes(b.size) }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
  gap: var(--space-2xs);
  margin: 0;
  padding: 0;
  list-style: none;
}
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
.thumb:hover,
.thumb.selected {
  border-color: var(--accent);
}
.thumb.selected {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}
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
.meta {
  max-inline-size: 100%;
  color: var(--muted);
  font-size: var(--font-size-xs);
  overflow-wrap: anywhere;
}
</style>
