<script setup lang="ts">
// A deployed coin: where it lives, what the wallet holds, and the full source package (a download, or pushed to the user's own GitHub).
import { ref } from 'vue'
import { CopyableAddress, ExplorerLink, UiButton, UiCard, UiNotice, UiStatGrid, UiStatRow } from '@meddleware/ui'
import { errorMessage, suiExplorerUrl, triggerDownload } from '@meddleware/web-utils'
import { generatePackageZip } from '@meddleware/token-issuance-client/package'
import type { PublishResult, TokenConfig } from '@meddleware/token-issuance-client'
import { explorerNetworkOf } from '../config.js'
import { fetchLicenseText } from '../lib/licenses.js'
import { policyStatements } from '../lib/policies.js'
import GithubPush from './GithubPush.vue'

const props = defineProps<{ result: PublishResult; config: TokenConfig }>()
defineEmits<{ (e: 'restart'): void }>()

const explorer = explorerNetworkOf(props.result.network)
const statements = policyStatements(props.config)
const downloading = ref(false)
const downloadError = ref<string | null>(null)

async function downloadPackage(): Promise<void> {
  downloading.value = true
  downloadError.value = null
  try {
    const licenseText = await fetchLicenseText(props.config.license)
    const zip = generatePackageZip({ config: props.config, licenseText: licenseText ?? undefined, result: props.result })
    triggerDownload(new Blob([zip as BlobPart], { type: 'application/zip' }), `${props.config.packageName}.zip`)
  } catch (e) {
    downloadError.value = errorMessage(e)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <UiCard :level="2" :title="`${config.symbol} is live on ${result.network}`">
    <UiStatGrid>
      <UiStatRow label="Coin type" align="left"><CopyableAddress :address="result.coinType" label="Copy coin type" :truncate="false" /></UiStatRow>
      <UiStatRow label="Package" align="left">
        <CopyableAddress :address="result.packageId" label="Copy package id">
          <ExplorerLink v-if="explorer" :href="suiExplorerUrl('object', result.packageId, explorer)" :value="result.packageId" />
        </CopyableAddress>
      </UiStatRow>
      <UiStatRow v-if="result.treasuryCapId" label="TreasuryCap" align="left">
        <CopyableAddress :address="result.treasuryCapId" label="Copy treasury cap id" />
      </UiStatRow>
      <UiStatRow v-if="result.metadataCapId" label="MetadataCap" align="left">
        <CopyableAddress :address="result.metadataCapId" label="Copy metadata cap id" />
      </UiStatRow>
      <UiStatRow v-if="!result.treasuryCapId" label="Supply" align="left">Fixed — recorded in the coin registry (no TreasuryCap exists)</UiStatRow>
      <UiStatRow v-if="!result.metadataCapId" label="Metadata" align="left">Frozen — recorded in the coin registry (no MetadataCap exists)</UiStatRow>
      <UiStatRow v-if="result.upgradeCapId" label="UpgradeCap" align="left">
        <CopyableAddress :address="result.upgradeCapId" label="Copy upgrade cap id" />
      </UiStatRow>
      <UiStatRow label="Package code" align="left">{{ result.upgradeCapId ? 'Upgradeable' : 'Immutable (UpgradeCap burned)' }}</UiStatRow>
    </UiStatGrid>

    <p class="actions">
      <UiButton variant="primary" :busy="downloading" @click="downloadPackage">Download source package (.zip)</UiButton>
      <UiButton variant="ghost" @click="$emit('restart')">Deploy another</UiButton>
    </p>
    <UiNotice v-if="downloadError" type="error" :message="downloadError" />

    <GithubPush :config="config" :result="result" />

    <p>The download is the full, buildable Move package, matching this on-chain deployment.</p>
    <h3>What your choices mean now</h3>
    <ul>
      <li v-for="s in statements" :key="s.id">
        <strong>{{ s.label }}: {{ s.choice }}.</strong> {{ s.text }}
      </li>
    </ul>
    <p>
      Whoever holds a capability has its power, and sending it to another address hands that power over, so keep each one in a wallet you
      control. This tool takes no custody of your token.
    </p>
    <p>
      You are the sole author of this token. This tool does not review or endorse it, and its appearance here is not a mark of legitimacy.
    </p>
  </UiCard>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}
</style>
