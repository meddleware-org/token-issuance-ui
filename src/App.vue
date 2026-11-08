<script setup lang="ts">
// Standalone shell for the token issuance SPA: the shared tool shell (header, colour mode, footer) with the network and the wallet in its
// header, then the tool view and the disclaimer. The core UI lives in TokenIssuanceView.vue (also exported for inline embedding in the
// dashboard, which supplies its own shell). There is no shared network selector component yet, so the select is local.
import { computed } from 'vue'
import { AppToolShell, CopyableAddress, ExplorerLink, UiButton, UiSelect } from '@meddleware/ui'
import { suiExplorerUrl } from '@meddleware/web-utils'
import { WalletModal, useNetwork, type MwNetwork } from '@meddleware/wallet-adapter'
import { SELECTABLE_NETWORKS } from './config.js'
import { useWallet } from './wallet.js'
import TokenIssuanceView from './components/TokenIssuanceView.vue'

const DOCS_URL = import.meta.env.VITE_DOCS_URL || undefined
// The developer site documents the coin template under /sui/onchain, not under a tool page of its own.
const DEV_URL = import.meta.env.VITE_DEV_URL || 'https://meddleware.dev/sui/onchain/token-issuance/overview'

const { account, disconnect } = useWallet()
const { network, setNetwork, explorerNetwork } = useNetwork()

const networkModel = computed({
  get: () => network.value,
  set: (v: string) => setNetwork(v as MwNetwork),
})
</script>

<template>
  <AppToolShell title="Token Issuance" slug="token-issuance" default-mode="system" :docs-url="DOCS_URL" :dev-url="DEV_URL">
    <template #actions>
      <label class="network">
        Network
        <UiSelect v-model="networkModel">
          <option v-for="n in SELECTABLE_NETWORKS" :key="n" :value="n">{{ n }}</option>
        </UiSelect>
      </label>
      <template v-if="account">
        <CopyableAddress :address="account.address">
          <ExplorerLink :href="suiExplorerUrl('account', account.address, explorerNetwork)" :value="account.address" />
        </CopyableAddress>
        <UiButton variant="ghost" @click="disconnect">Disconnect</UiButton>
      </template>
      <WalletModal v-else :required-features="['sui:signTransaction']" />
    </template>

    <TokenIssuanceView />

    <aside class="disclaimer" aria-label="Disclaimer">
      <p>
        Client-side token deployment. This tool never takes custody of your token or keys. A coin's symbol and decimals are permanent once
        published; whether its name, description and icon can change depends on the metadata policy you choose.
      </p>
      <p>
        <strong>No endorsement.</strong> This is a neutral, self-serve tool. It does not review, verify, or endorse any token created with it,
        nor its creator. A token existing here implies nothing about its legitimacy or value — always do your own research before acquiring or
        trading any coin.
      </p>
    </aside>
  </AppToolShell>
</template>

<style scoped>
/* The select is a control in the header's row, not a row of its own. */
.network {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-2xs);
  align-items: center;
  max-inline-size: 100%;
}
.network :deep(.mw-select) {
  inline-size: auto;
  max-inline-size: 100%;
}
.disclaimer {
  margin-top: var(--space-md);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: var(--font-size-sm);
}
</style>
