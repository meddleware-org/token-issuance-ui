<script setup lang="ts">
// Standalone shell for the token issuance SPA: header (network, wallet, colour mode), the tool view, the disclaimer and the footer.
// The core UI lives in TokenIssuanceView.vue (also exported for inline embedding in the dashboard, which supplies its own shell).
import { computed } from 'vue'
import {
  AppFooter,
  AppHeader,
  ColorModeControl,
  CopyableAddress,
  CopyrightLine,
  ExplorerLink,
  UiAppShell,
  UiButton,
  UiSelect,
  useColorMode,
} from '@meddleware/ui'
import { suiExplorerUrl } from '@meddleware/web-utils'
import { WalletModal, useNetwork, type MwNetwork } from '@meddleware/wallet-adapter'
import { SELECTABLE_NETWORKS, explorerNetworkOf } from './config.js'
import { useWallet } from './wallet.js'
import TokenIssuanceView from './components/TokenIssuanceView.vue'

const { mode, set } = useColorMode('system')
const { account, disconnect } = useWallet()
const { network, setNetwork } = useNetwork()

const networkModel = computed({
  get: () => network.value,
  set: (v: string) => setNetwork(v as MwNetwork),
})
const explorerNetwork = computed(() => explorerNetworkOf(network.value))
</script>

<template>
  <UiAppShell contained>
    <template #header>
      <AppHeader variant="dark">
        <template #brand>Token Issuance</template>
        <template #actions>
          <UiSelect v-model="networkModel" class="network" aria-label="Network">
            <option v-for="n in SELECTABLE_NETWORKS" :key="n" :value="n">{{ n }}</option>
          </UiSelect>
          <template v-if="account">
            <CopyableAddress :address="account.address">
              <ExplorerLink v-if="explorerNetwork" :href="suiExplorerUrl('account', account.address, explorerNetwork)" :value="account.address" />
            </CopyableAddress>
            <UiButton variant="ghost" @click="disconnect">Disconnect</UiButton>
          </template>
          <WalletModal v-else :required-features="['sui:signTransaction']" />
          <ColorModeControl :model-value="mode" @update:model-value="set" />
        </template>
      </AppHeader>
    </template>

    <h1 class="mw-visually-hidden">Create your own Sui coin</h1>
    <TokenIssuanceView />

    <aside class="disclaimer" aria-label="Disclaimer">
      <p>
        Client-side token deployment. This tool never takes custody of your token or keys. Symbol, name, and decimals are permanent once
        published.
      </p>
      <p>
        <strong>No endorsement.</strong> This is a neutral, self-serve tool. It does not review, verify, or endorse any token created with it,
        nor its creator. A token existing here implies nothing about its legitimacy or value — always do your own research before acquiring or
        trading any coin.
      </p>
    </aside>

    <template #footer>
      <AppFooter>
        <CopyrightLine symbol-variant="kopimi" organisation-name="Meddleware" rights-statement="jam" />
      </AppFooter>
    </template>
  </UiAppShell>
</template>

<style scoped>
/* The select is a control in the header's row, not a row of its own. */
.network {
  inline-size: auto;
}
.disclaimer {
  margin-top: var(--space-md);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: var(--font-size-sm);
}
</style>
