<script setup lang="ts">
// The coins the connected wallet deployed or controls (an owned TreasuryCap<T> or MetadataCap<T>, or a held coin whose package the wallet
// published — a fixed supply with frozen metadata has no capability). Read-only, like access-gate's "My Gates". Loads on mount and whenever
// the address or network changes.
import { computed, ref, shallowRef, watch } from 'vue'
import { CopyableAddress, ExplorerLink, UiCard, UiEmptyState, UiLiveStatus, UiNotice, UiStatGrid, UiStatRow } from '@meddleware/ui'
import { createGeneration, errorMessage, suiExplorerUrl } from '@meddleware/web-utils'
import { listMyTokens, type DeployedToken, type TokenNetwork as Network } from '@meddleware/token-issuance-client'
import { explorerNetworkOf } from '../config.js'
import { getReadClient } from '../wallet.js'

const props = defineProps<{ owner: string | null; network: Network }>()

// SuiVision has no localnet explorer, so object links exist only on public networks.
const explorerNetwork = computed(() => explorerNetworkOf(props.network))

const tokens = shallowRef<DeployedToken[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// A result that arrives after a newer load started (an account or network switch mid-request) is dropped, so one account's or network's
// tokens never show under another.
const generation = createGeneration()

async function load(): Promise<void> {
  const current = generation.begin()
  if (!props.owner) {
    tokens.value = []
    error.value = null
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const found = await listMyTokens(getReadClient(props.network), props.owner)
    if (current()) tokens.value = found
  } catch (e) {
    if (!current()) return
    error.value = errorMessage(e)
    tokens.value = []
  } finally {
    if (current()) loading.value = false
  }
}

watch(() => [props.owner, props.network] as const, load, { immediate: true })
defineExpose({ reload: load })
</script>

<template>
  <UiLiveStatus label="Your tokens" :message="loading ? 'Loading your deployed tokens…' : ''" />
  <UiNotice v-if="error && !loading" type="error" :message="error" />
  <UiEmptyState v-else-if="!loading && !tokens.length">No deployed tokens found for this wallet. Deploy one from the Deploy tab.</UiEmptyState>
  <ul v-else-if="!loading" class="list" role="list">
    <UiCard v-for="t in tokens" :key="t.coinType" as="li" plain :level="3" :title="t.label">
      <UiStatGrid>
        <UiStatRow label="Coin type" align="left"><CopyableAddress :address="t.coinType" label="Copy coin type" :truncate="false" /></UiStatRow>
        <UiStatRow label="Package" align="left">
          <CopyableAddress :address="t.packageId" label="Copy package id">
            <ExplorerLink v-if="explorerNetwork" :href="suiExplorerUrl('object', t.packageId, explorerNetwork)" :value="t.packageId" />
          </CopyableAddress>
        </UiStatRow>
        <UiStatRow label="Treasury cap" align="left">
          <CopyableAddress v-if="t.treasuryCapId" :address="t.treasuryCapId" label="Copy treasury cap id">
            <ExplorerLink v-if="explorerNetwork" :href="suiExplorerUrl('object', t.treasuryCapId, explorerNetwork)" :value="t.treasuryCapId" />
          </CopyableAddress>
          <template v-else>None — the supply is fixed, or the cap is held elsewhere</template>
        </UiStatRow>
        <UiStatRow label="Metadata cap" align="left">
          <CopyableAddress v-if="t.metadataCapId" :address="t.metadataCapId" label="Copy metadata cap id">
            <ExplorerLink v-if="explorerNetwork" :href="suiExplorerUrl('object', t.metadataCapId, explorerNetwork)" :value="t.metadataCapId" />
          </CopyableAddress>
          <template v-else>None — the metadata is frozen, or the cap is held elsewhere</template>
        </UiStatRow>
      </UiStatGrid>
    </UiCard>
  </ul>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
