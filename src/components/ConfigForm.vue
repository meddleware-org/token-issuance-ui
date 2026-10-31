<script setup lang="ts">
// The three configuration steps of the deploy wizard (identity, token, settings), one fieldset each. The parent owns the form model
// and reads the same object back, so the fields edit it in place; an error shows only once its field was left.
import { computed, reactive } from 'vue'
import { UiButton, UiFieldHint, UiSelectField, UiTextField } from '@meddleware/ui'
import type { TokenNetwork as Network } from '@meddleware/token-issuance-client'
import type { FormModel } from '../lib/form.js'
import { deriveStructName, type FormErrors } from '../lib/validation.js'
import IconPicker from './IconPicker.vue'
import LicensePicker from './LicensePicker.vue'

export type ConfigFormStep = 'identity' | 'token' | 'settings'

const form = defineModel<FormModel>('form', { required: true })
const props = defineProps<{
  errors: FormErrors
  canProceed: boolean
  network: Network
  connected: boolean
  formStep: ConfigFormStep
}>()
const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()

const SUPPLY_POLICIES = [['mintable', 'Mintable'], ['fixed', 'Fixed']] as const
const METADATA_POLICIES = [['updatable', 'Updatable'], ['frozen', 'Frozen']] as const
const PACKAGE_POLICIES = [['immutable', 'Immutable'], ['upgradeable', 'Upgradeable']] as const

const structPreview = computed(() => {
  const m = form.value.moduleName.trim()
  return m ? deriveStructName(m) : '—'
})
const coinTypePreview = computed(() => `<package>::${form.value.moduleName.trim() || 'module'}::${structPreview.value}`)
const identifierError = computed(() => visibleError('packageName') || visibleError('moduleName'))

const touched = reactive(new Set<string>())
function visibleError(key: string): string | undefined {
  return touched.has(key) ? props.errors[key as keyof FormErrors] : undefined
}

function onBlur(key: string): void {
  touched.add(key)
  const fields = form.value as unknown as Record<string, unknown>
  if (typeof fields[key] === 'string') fields[key] = (fields[key] as string).trim()
}
</script>

<template>
  <form novalidate @submit.prevent="emit('next')">
    <!-- Step 1: Identity -->
    <fieldset v-if="formStep === 'identity'">
      <legend>Package identity <span class="permanent">(permanent)</span></legend>
      <div class="pair">
        <UiTextField id="package" v-model="form.packageName" label="Package name" placeholder="my_token" :error="visibleError('packageName')" @blur="onBlur('packageName')">
          <template #label-suffix>
            <UiFieldHint field-id="package-name">
              The on-chain Move package name (snake_case, e.g. <b>my_token</b>). It identifies the published package and cannot be changed
              after deployment.
            </UiFieldHint>
          </template>
        </UiTextField>
        <UiTextField id="module" v-model="form.moduleName" label="Module name" placeholder="mytoken" :error="visibleError('moduleName')" @blur="onBlur('moduleName')">
          <template #label-suffix>
            <UiFieldHint field-id="module-name">
              The Move module inside the package (lowercase, e.g. <b>mytoken</b>). The coin type and its one-time-witness struct are derived
              from this name, so it is permanent too.
            </UiFieldHint>
          </template>
        </UiTextField>
      </div>
      <p class="preview" aria-live="polite">
        <template v-if="identifierError">Fix the package and module names to preview the coin type.</template>
        <template v-else>
          Coin type will be <code>{{ coinTypePreview }}</code
          >. The witness struct <code>{{ structPreview }}</code> is derived from the module name (a Sui requirement).
        </template>
      </p>
    </fieldset>

    <!-- Step 2: Token -->
    <fieldset v-else-if="formStep === 'token'">
      <legend>Token details</legend>
      <div class="pair">
        <UiTextField id="name" v-model="form.name" label="Token name" :error="visibleError('name')" @blur="onBlur('name')">
          <template #label-suffix>
            <UiFieldHint field-id="token-name">
              The human-readable display name shown in wallets and explorers (e.g. <b>My Token</b>). Editable later if you keep the Updatable
              metadata policy.
            </UiFieldHint>
          </template>
        </UiTextField>
        <UiTextField id="symbol" v-model="form.symbol" label="Symbol" :error="visibleError('symbol')" @blur="onBlur('symbol')">
          <template #label-suffix>
            <UiFieldHint field-id="token-symbol">
              The short ticker shown in wallets (e.g. <b>MYT</b>), typically 3–5 uppercase letters.
            </UiFieldHint>
          </template>
        </UiTextField>
      </div>

      <UiTextField id="description" v-model="form.description" label="Description" :rows="3" :error="visibleError('description')" @blur="onBlur('description')">
        <template #label-suffix>
          <span class="note"> (optional)</span>
          <UiFieldHint field-id="token-description">
            A short blurb stored in the coin metadata and shown in some wallets/explorers. Leave blank if you don't need one.
          </UiFieldHint>
        </template>
      </UiTextField>

      <UiTextField id="decimals" v-model="form.decimals" label="Decimals" inputmode="numeric" :error="visibleError('decimals')" @blur="onBlur('decimals')">
        <template #label-suffix>
          <span class="permanent"> (permanent)</span>
          <UiFieldHint field-id="token-decimals">
            How many decimal places the coin supports. <b>9</b> is the Sui convention (1 token = 1,000,000,000 base units). Fixed at
            deployment and cannot be changed.
          </UiFieldHint>
        </template>
      </UiTextField>

      <IconPicker v-model="form.iconUrl" :network="network" :connected="connected" :error="visibleError('iconUrl')" @blur="onBlur('iconUrl')" />
    </fieldset>

    <!-- Step 3: Settings -->
    <fieldset v-else>
      <legend>Supply &amp; policies</legend>

      <UiTextField id="supply" v-model="form.initialSupply" label="Initial supply" inputmode="numeric" placeholder="0" :error="visibleError('initialSupply')" @blur="onBlur('initialSupply')">
        <template #label-suffix>
          <UiFieldHint field-id="supply">
            The number of whole tokens minted when the coin is created and sent to the recipient. Uses your chosen decimal precision — with 9
            decimals, 1 token = 1,000,000,000 base units on-chain. Enter <b>0</b> or leave blank for no initial supply. You can mint more
            later if you choose the Mintable supply policy; a Fixed supply needs an amount above zero.
          </UiFieldHint>
        </template>
      </UiTextField>

      <div class="pair">
        <UiSelectField id="supply-policy" v-model="form.supplyPolicy" label="Supply" :options="SUPPLY_POLICIES">
          <template #label-suffix>
            <UiFieldHint field-id="supply-policy">
              <b>Mintable</b>: you keep the TreasuryCap and can mint more tokens at any time.<br />
              <b>Fixed</b>: the whole supply is minted when the coin is created and the coin registry takes the TreasuryCap — nobody can ever
              mint more, and wallets can see that.
            </UiFieldHint>
          </template>
        </UiSelectField>
        <UiSelectField id="metadata-policy" v-model="form.metadataPolicy" label="Metadata" :options="METADATA_POLICIES">
          <template #label-suffix>
            <UiFieldHint field-id="metadata-policy">
              <b>Updatable</b>: you keep the MetadataCap and can later change the name, symbol, description, or icon.<br />
              <b>Frozen</b>: the MetadataCap is deleted when the coin is created — all metadata is permanently locked, and wallets can see that.
            </UiFieldHint>
          </template>
        </UiSelectField>
      </div>

      <UiSelectField id="package-policy" v-model="form.packagePolicy" label="Package code" :options="PACKAGE_POLICIES">
        <template #label-suffix>
          <UiFieldHint field-id="package-policy">
            <b>Immutable</b>: the UpgradeCap is burned — the on-chain code is sealed. Recommended for trust and auditability.<br />
            <b>Upgradeable</b>: you keep the UpgradeCap and can push code changes to the package after deployment.
          </UiFieldHint>
        </template>
      </UiSelectField>

      <UiTextField id="recipient" v-model="form.recipient" label="Recipient" placeholder="0x…" :error="visibleError('recipient')" @blur="onBlur('recipient')">
        <template #label-suffix>
          <UiFieldHint field-id="recipient">
            The Sui address that receives the TreasuryCap, MetadataCap, UpgradeCap (if kept), and any initial supply minted at deployment.
            Leave blank to send everything to the connected wallet. Enter a different address to separate the deployer wallet from the custody
            wallet.
          </UiFieldHint>
        </template>
      </UiTextField>

      <LicensePicker v-model="form.license" @name="form.licenseName = $event" />
    </fieldset>

    <p class="actions">
      <UiButton v-if="formStep !== 'identity'" variant="ghost" @click="emit('back')">Back</UiButton>
      <UiButton type="submit" :disabled="!canProceed">{{ formStep === 'settings' ? 'Review & deploy' : 'Next' }}</UiButton>
    </p>
  </form>
</template>

<style scoped>
fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}
legend {
  padding: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0 var(--space-sm);
}
@media (width >= 32.5rem) {
  .pair {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.permanent {
  color: var(--danger);
  font-weight: var(--font-weight-semibold);
}
.note {
  color: var(--muted);
}
.preview {
  color: var(--muted);
  font-size: var(--font-size-sm);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}
</style>
