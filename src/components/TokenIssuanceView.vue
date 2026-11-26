<script setup lang="ts">
// Core token issuance UI (the deploy wizard and the list of coins a wallet deployed), free of any app shell. Rendered standalone by
// App.vue and inline by the dashboard; wallet state comes from the shared @meddleware/wallet-adapter singleton. The wizard's panels load
// when first shown, so the eager bundle stays small.
// Vue, the shared UI components, the wallet gate and network state, the token client's types, the browser storage helper and this app's own modules.
import { computed, defineAsyncComponent, reactive, ref, watch } from 'vue'
import { useNetwork, WalletGuard } from '@meddleware/wallet-adapter'
import {
  AppTabNav,
  UiButton,
  UiCard,
  UiNotice,
  UiStepper,
  UiTabPanel,
  UiToolIntro,
  type AppTab,
  type StepperStep,
} from '@meddleware/ui'
import type { TokenNetwork as Network } from '@meddleware/token-issuance-client'
import { browserStorage } from '@meddleware/walrus-storage-client/flow'
import { useWallet } from '../wallet.js'
import { FEE_MIST, FEE_TREASURY, PUBLISH_GAS_BUDGET, isFeeConfigured, isNetworkOpen } from '../config.js'
import { emptyForm, toTokenConfig } from '../lib/form.js'
import { deployStepStatuses } from '../lib/deploy-steps.js'
import { validateForm, type FormErrors } from '../lib/validation.js'
import { useDeploy } from '../composables/useDeploy.js'
import type { ConfigFormStep } from './ConfigForm.vue'

// The wizard's panels are loaded when first shown, so the eager bundle stays small.
const ConfigForm = defineAsyncComponent(() => import('./ConfigForm.vue'))
const ReviewPanel = defineAsyncComponent(() => import('./ReviewPanel.vue'))
const ResultPanel = defineAsyncComponent(() => import('./ResultPanel.vue'))
const MyTokens = defineAsyncComponent(() => import('./MyTokens.vue'))
const TermsDialog = defineAsyncComponent(() => import('./TermsDialog.vue'))

/** Where the wizard is: a configuration step, the review, or a state of the deploy flow. */
type Step = ConfigFormStep | 'review' | 'deploying' | 'incomplete' | 'published' | 'done'

// The stepper over the five stages the person sees.
const STEPS: StepperStep[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'token', label: 'Token' },
  { id: 'settings', label: 'Settings' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
]
// The three configuration steps.
const CONFIG_STEPS: ConfigFormStep[] = ['identity', 'token', 'settings']
/** The form fields each configuration step asks for: a step cannot be left while one of them has an error. */
const STEP_KEYS: Record<ConfigFormStep, (keyof FormErrors)[]> = {
  identity: ['packageName', 'moduleName'],
  token: ['name', 'symbol', 'description', 'iconUrl', 'decimals'],
  settings: ['initialSupply', 'recipient'],
}
// The stepper index of the review.
const REVIEW_INDEX = CONFIG_STEPS.length

// The shared wallet account and network, and whether token issuance is open on this network (mainnet stays closed until its fee treasury is set).
const { account } = useWallet()
const { network } = useNetwork()
const networkOpen = computed(() => isNetworkOpen(network.value as Network))

// Top-level tabs — Deploy (the wizard) and My Tokens (coins this wallet has deployed), so the layout matches the other Sui tools
// (intro → tabs → content).
const TABS: AppTab[] = [
  { id: 'deploy', label: 'Deploy' },
  { id: 'my-tokens', label: 'My Tokens' },
]
// The open tab.
const activeTab = ref('deploy')

// The form model, the wizard's step and the deploy flow.
const form = reactive(emptyForm())
const step = ref<Step>('identity')
const flow = useDeploy()
// A wallet message ("Connect a wallet first.") or the flow's error.
const walletError = ref<string | null>(null)
// The error shown: a wallet message or the flow's error.
const deployError = computed(() => walletError.value ?? flow.error.value)
// The flow decides the step once it leaves `deploying`: a failure before publishing returns to the review; anything after a publish never
// does (a second deploy would publish a second coin).
watch(flow.phase, (phase) => {
  if (phase === 'deploying' || phase === 'done' || phase === 'incomplete' || phase === 'published') step.value = phase
  else if (phase === 'failed') step.value = 'review'
})
// Storage that never throws: with site data blocked the terms are simply asked again next visit.
const storage = browserStorage()
// Whether the terms were accepted before (read from storage that never throws), and whether the terms dialog is open.
const termsAccepted = ref(storage.getItem('sui-deployer:terms-accepted') === '1')
const showTerms = ref(false)

// Validation of the form, the typed configuration and whether a wallet is connected.
const errors = computed(() => validateForm(form))
const config = computed(() => toTokenConfig(form))
const connected = computed(() => Boolean(account.value))

// Derived position: the configuration step index, whether the wizard is in configuration, whether the person may proceed and the stepper position.
const configIndex = computed(() => CONFIG_STEPS.indexOf(step.value as ConfigFormStep))
const inConfig = computed(() => configIndex.value >= 0)
// The next button is enabled when a wallet is connected and the current step has no error.
const canProceed = computed(
  () => connected.value && (!inConfig.value || !STEP_KEYS[step.value as ConfigFormStep].some((k) => Boolean(errors.value[k]))),
)
// The stepper position.
const stepIndex = computed(() => (inConfig.value ? configIndex.value : step.value === 'done' ? STEPS.length - 1 : REVIEW_INDEX))
// The deploy progress list for the flow's current step.
const deploySteps = computed(() => deployStepStatuses(flow.step.value))

/** The stepper's earlier steps go back to that step (a later one is not reachable from here). */
function onStepperBack(i: number): void {
  const target = CONFIG_STEPS[i]
  if (target && (step.value === 'review' || (inConfig.value && i < configIndex.value))) step.value = target
}

/** goNext(): the next configuration step; after the last, the terms are shown first if they were not accepted. */
function goNext(): void {
  if (!canProceed.value || !inConfig.value) return
  const next = CONFIG_STEPS[configIndex.value + 1]
  if (next) step.value = next
  else if (termsAccepted.value) step.value = 'review'
  else showTerms.value = true
}

/** goBack(): the previous step. */
function goBack(): void {
  if (step.value === 'review') step.value = 'settings'
  else if (configIndex.value > 0) step.value = CONFIG_STEPS[configIndex.value - 1]
}

/** onTermsAccept(): remember the acceptance and go to the review. */
function onTermsAccept(): void {
  storage.setItem('sui-deployer:terms-accepted', '1')
  termsAccepted.value = true
  showTerms.value = false
  step.value = 'review'
}

/** confirmDeploy(): refuse without a connected wallet or on a closed network, then run the deploy with the configured fee and treasury (no fee where none is configured). */
async function confirmDeploy(): Promise<void> {
  const sender = account.value?.address
  if (!sender) {
    walletError.value = 'Connect a wallet first.'
    return
  }
  walletError.value = null
  const net = network.value as Network
  if (!isNetworkOpen(net)) return
  await flow.deploy({
    config: config.value,
    network: net,
    sender,
    feeMist: isFeeConfigured(net) ? FEE_MIST : 0n,
    feeTreasury: FEE_TREASURY[net],
    gasBudget: PUBLISH_GAS_BUDGET,
  })
}

/** restart(): clear the flow and begin a new token. */
function restart(): void {
  flow.reset()
  walletError.value = null
  step.value = 'identity'
}
</script>

<template>
  <section aria-labelledby="token-issuance-title">
    <h2 id="token-issuance-title">Token issuance</h2>
    <!-- A one-sentence introduction naming the network. -->
    <UiToolIntro>
      Deploy your own Sui coin directly from your browser ({{ network }}). Your wallet signs and pays gas — nothing is compiled or signed on
      a server — and you keep the full, verifiable source package.
    </UiToolIntro>

    <!-- The two tabs: Deploy and My Tokens. -->
    <AppTabNav v-model="activeTab" :tabs="TABS" id-prefix="token-issuance" aria-label="Sections" />

    <!-- The tab list and its panel always render (the selected tab controls a live panel); the wallet prompt replaces only the panel's
         content until a wallet is connected. -->
    <UiTabPanel id-prefix="token-issuance" :tab="activeTab">
      <WalletGuard message="Connect a Sui wallet to deploy your token.">
        <UiNotice
          v-if="activeTab === 'deploy' && !networkOpen"
          type="info"
          :message="`Token issuance is not open on ${network} yet. Switch to testnet to try it.`"
        />
        <template v-else-if="activeTab === 'deploy'">
          <!-- The stepper; earlier steps can be returned to. -->
          <UiStepper :steps="STEPS" :model-value="stepIndex" @update:model-value="onStepperBack" />

          <!-- The configuration steps. -->
          <ConfigForm
            v-if="inConfig"
            :form="form"
            :errors="errors"
            :can-proceed="canProceed"
            :network="network"
            :connected="connected"
            :form-step="step as ConfigFormStep"
            @next="goNext"
            @back="goBack"
          />
          <!-- The review before anything is signed. -->
          <ReviewPanel v-else-if="step === 'review'" :config="config" :network="network" @back="goBack" @confirm="confirmDeploy" />

          <!-- While deploying: the progress list and a request to keep the tab open. -->
          <UiCard v-else-if="step === 'deploying'" :level="2" title="Deploying…">
            <UiStepper :steps="deploySteps" orientation="vertical" />
            <p>Keep this tab open and approve the wallet prompts.</p>
          </UiCard>

          <!-- The coin is published but its setup is not: never offer a second deploy (it would publish a second coin and charge the fee again); offer to finish. -->
          <UiCard v-else-if="step === 'incomplete' && flow.pending.value" :level="2" title="Your coin is published — finish its setup">
            <p>
              <code>{{ flow.pending.value.result.coinType }}</code> exists on {{ flow.pending.value.result.network }}, but the second
              transaction did not complete: the currency is not registered, the initial supply is not minted and your supply and metadata
              choices are not applied yet. The caps are in your wallet.
            </p>
            <p>Do not deploy again — that would publish a second coin. Sign the setup transaction instead.</p>
            <UiButton variant="primary" @click="flow.finish()">Finish setup (sign again)</UiButton>
          </UiCard>

          <!-- A coin was published but the result could not be read: show the transaction and offer no deploy. -->
          <UiCard v-else-if="step === 'published'" :level="2" title="A coin was published, but the result could not be read">
            <p>
              Publish transaction <code>{{ flow.publishDigest.value }}</code
              >. Check it in an explorer before doing anything else; do not deploy again.
            </p>
            <UiButton variant="ghost" @click="restart">Start a new token</UiButton>
          </UiCard>

          <!-- The finished coin. -->
          <ResultPanel v-else-if="step === 'done' && flow.result.value" :result="flow.result.value" :config="config" @restart="restart" />

          <UiNotice v-if="deployError" type="error" :message="deployError" />
        </template>

        <!-- The second tab: coins this wallet has deployed. -->
        <MyTokens v-else :owner="account?.address ?? null" :network="network" />
      </WalletGuard>
    </UiTabPanel>

    <!-- The terms the person must accept before the first review. -->
    <TermsDialog :open="showTerms" @accept="onTermsAccept" @cancel="showTerms = false" />
  </section>
</template>
