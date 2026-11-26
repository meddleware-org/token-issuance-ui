<script setup lang="ts">
// The three configuration steps of the deploy wizard (identity, token, settings), one fieldset each. The parent owns the form model
// and reads the same object back, so the fields edit it in place; an error shows only once its field was left.
// Vue, the shared form components, the token client's network type and this app's own modules.
import { computed, reactive } from 'vue'
import { UiButton, UiFieldHint, UiSelectField, UiTextField } from '@meddleware/ui'
import type { TokenNetwork as Network } from '@meddleware/token-issuance-client'
import type { FormModel } from '../lib/form.js'
import { deriveStructName, type FormErrors } from '../lib/validation.js'
import IconPicker from './IconPicker.vue'
import LicensePicker from './LicensePicker.vue'
import { METADATA_LABELS, METADATA_TEXT, PACKAGE_LABELS, PACKAGE_TEXT, SUPPLY_LABELS, SUPPLY_TEXT } from '../lib/policies.js'

/** The three configuration steps of the wizard. */
export type ConfigFormStep = 'identity' | 'token' | 'settings'

// The form model, edited in place; the parent reads the same object back.
const form = defineModel<FormModel>('form', { required: true })
// The component's inputs.
const props = defineProps<{
  errors: FormErrors
  canProceed: boolean
  network: Network
  connected: boolean
  formStep: ConfigFormStep
}>()
// Events: next and back.
const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()

// The option lists of the three policy selects.
const SUPPLY_POLICIES = Object.entries(SUPPLY_LABELS) as [string, string][]
const METADATA_POLICIES = Object.entries(METADATA_LABELS) as [string, string][]
const PACKAGE_POLICIES = Object.entries(PACKAGE_LABELS) as [string, string][]

// Live previews of the derived struct name and the coin type.
const structPreview = computed(() => {
  const m = form.value.moduleName.trim()
  return m ? deriveStructName(m) : '—'
})
// The coin type as it will read, with the package id still unknown.
const coinTypePreview = computed(() => `<package>::${form.value.moduleName.trim() || 'module'}::${structPreview.value}`)
// Whether either identifier has a visible error (the preview is shown only without one).
const identifierError = computed(() => visibleError('packageName') || visibleError('moduleName'))

// An error shows only once its field was left.
const touched = reactive(new Set<string>())
/** The error for a field, shown only once the field was left. */
function visibleError(key: string): string | undefined {
  return touched.has(key) ? props.errors[key as keyof FormErrors] : undefined
}

/** onBlur(key): mark the field as touched and trim its text. */
function onBlur(key: string): void {
  touched.add(key)
  const fields = form.value as unknown as Record<string, unknown>
  if (typeof fields[key] === 'string') fields[key] = (fields[key] as string).trim()
}
</script>

<template>
  <form novalidate @submit.prevent="emit('next')">
    <!-- Step 1: Identity -->
    <!-- Step 1: the package identity, which is permanent. -->
    <fieldset v-if="formStep === 'identity'">
      <!-- The step title, with a note that it is permanent. -->
      <legend>Package identity <span class="permanent">(permanent)</span></legend>
      <div class="pair">
        <!-- The Package name field. -->
        <!-- The Move package name: permanent, snake_case. -->
        <UiTextField id="package" v-model="form.packageName" label="Package name" placeholder="my_token" :error="visibleError('packageName')" @blur="onBlur('packageName')">
          <!-- A hint beside the label explains the field in a popover. -->
          <template #label-suffix>
            <UiFieldHint field-id="package-name">
              The on-chain Move package name (snake_case, for example <code>my_token</code>). It identifies the published package and cannot be changed
              after deployment.
            </UiFieldHint>
          </template>
        </UiTextField>
        <!-- The Module name field. -->
        <!-- The Move module name: permanent, lowercase; the coin type and the witness struct come from it. -->
        <UiTextField id="module" v-model="form.moduleName" label="Module name" placeholder="mytoken" :error="visibleError('moduleName')" @blur="onBlur('moduleName')">
          <template #label-suffix>
            <UiFieldHint field-id="module-name">
              The Move module inside the package (lowercase, for example <code>mytoken</code>). The coin type and its one-time-witness struct are derived
              from this name, so it is permanent too.
            </UiFieldHint>
          </template>
        </UiTextField>
      </div>
      <!-- A live preview of the coin type; it is announced politely when it changes. -->
      <p class="preview" aria-live="polite">
        <template v-if="identifierError">Fix the package and module names to preview the coin type.</template>
        <template v-else>
          Coin type will be <code>{{ coinTypePreview }}</code
          >. The witness struct <code>{{ structPreview }}</code> is derived from the module name (a Sui requirement).
        </template>
      </p>
    </fieldset>

    <!-- Step 2: Token -->
    <!-- Step 2: the token's name, symbol, description, decimals and icon. -->
    <fieldset v-else-if="formStep === 'token'">
      <legend>Token details</legend>
      <div class="pair">
        <!-- The Token name field. -->
        <!-- The display name shown in wallets and explorers. -->
        <UiTextField id="name" v-model="form.name" label="Token name" :error="visibleError('name')" @blur="onBlur('name')">
          <template #label-suffix>
            <UiFieldHint field-id="token-name">
              The display name shown in wallets and explorers (for example <code>My Token</code>). With the Updatable metadata policy the
              MetadataCap holder can change it later; with Frozen it is permanent.
            </UiFieldHint>
          </template>
        </UiTextField>
        <!-- The Symbol field. -->
        <!-- The ticker: permanent whichever metadata policy is chosen. -->
        <UiTextField id="symbol" v-model="form.symbol" label="Symbol" :error="visibleError('symbol')" @blur="onBlur('symbol')">
          <template #label-suffix>
            <span class="permanent"> (permanent)</span>
            <UiFieldHint field-id="token-symbol">
              The short ticker shown in wallets (for example <code>MYT</code>), typically 3–5 uppercase letters.
              <strong>The symbol can never change</strong>, whichever metadata policy you choose.
            </UiFieldHint>
          </template>
        </UiTextField>
      </div>

      <!-- The Description field. -->
      <!-- An optional blurb stored in the coin metadata. -->
      <UiTextField id="description" v-model="form.description" label="Description" :rows="3" :error="visibleError('description')" @blur="onBlur('description')">
        <template #label-suffix>
          <span class="note"> (optional)</span>
          <UiFieldHint field-id="token-description">
            A short blurb stored in the coin metadata and shown in some wallets and explorers. The MetadataCap holder can change it later
            unless the metadata is frozen. Leave blank if you don't need one.
          </UiFieldHint>
        </template>
      </UiTextField>

      <!-- The Decimals field. -->
      <!-- Decimal places: permanent; 9 is the Sui convention. -->
      <UiTextField id="decimals" v-model="form.decimals" label="Decimals" inputmode="numeric" :error="visibleError('decimals')" @blur="onBlur('decimals')">
        <template #label-suffix>
          <span class="permanent"> (permanent)</span>
          <UiFieldHint field-id="token-decimals">
            How many decimal places the coin supports. <code>9</code> is the Sui convention (1 token = 1,000,000,000 base units).
            <strong>Fixed at publishing; it can never change.</strong>
          </UiFieldHint>
        </template>
      </UiTextField>

      <!-- The icon: a URL, an upload to Walrus, or a blob already stored there. -->
      <IconPicker v-model="form.iconUrl" :network="network" :connected="connected" :error="visibleError('iconUrl')" @blur="onBlur('iconUrl')" />
    </fieldset>

    <!-- Step 3: Settings -->
    <!-- Step 3: the supply and the three policies, the recipient and the licence. -->
    <fieldset v-else>
      <legend>Supply &amp; policies</legend>

      <!-- The initial supply in whole tokens, minted when the coin is created. -->
      <UiTextField id="supply" v-model="form.initialSupply" label="Initial supply" inputmode="numeric" placeholder="0" :error="visibleError('initialSupply')" @blur="onBlur('initialSupply')">
        <template #label-suffix>
          <UiFieldHint field-id="supply">
            The number of whole tokens minted when the coin is created and sent to the recipient. Uses your chosen decimal precision — with 9
            decimals, 1 token = 1,000,000,000 base units on-chain. Enter <code>0</code> or leave blank for no initial supply. You can mint more
            later if you choose the Mintable supply policy; a Fixed supply needs an amount above zero.
          </UiFieldHint>
        </template>
      </UiTextField>

      <div class="pair">
        <!-- Mintable (the TreasuryCap holder can mint more) or fixed (nobody can). -->
        <UiSelectField id="supply-policy" v-model="form.supplyPolicy" label="Supply" :options="SUPPLY_POLICIES" :hint="SUPPLY_TEXT[form.supplyPolicy]">
          <template #label-suffix>
            <UiFieldHint field-id="supply-policy">
              <dfn>Mintable</dfn>: whoever holds the TreasuryCap can mint more coins. <dfn>Fixed</dfn>: the whole supply is minted now and the
              coin registry takes the TreasuryCap, so nobody can ever mint more.
            </UiFieldHint>
          </template>
        </UiSelectField>
        <!-- Updatable (the MetadataCap holder can change name, description and icon) or frozen. -->
        <UiSelectField id="metadata-policy" v-model="form.metadataPolicy" label="Metadata" :options="METADATA_POLICIES" :hint="METADATA_TEXT[form.metadataPolicy]">
          <template #label-suffix>
            <UiFieldHint field-id="metadata-policy">
              <dfn>Updatable</dfn>: whoever holds the MetadataCap can change the name, description and icon. <dfn>Frozen</dfn>: the
              MetadataCap is deleted, so they can never change. The symbol and decimals are permanent either way.
            </UiFieldHint>
          </template>
        </UiSelectField>
      </div>

      <!-- Immutable (the UpgradeCap is burned) or upgradeable (the recipient holds it). -->
      <UiSelectField id="package-policy" v-model="form.packagePolicy" label="Package code" :options="PACKAGE_POLICIES" :hint="PACKAGE_TEXT[form.packagePolicy]">
        <template #label-suffix>
          <UiFieldHint field-id="package-policy">
            <dfn>Immutable</dfn>: the UpgradeCap is burned, which seals the on-chain code. <dfn>Upgradeable</dfn>: the recipient gets the
            UpgradeCap and can publish changed code later.
          </UiFieldHint>
        </template>
      </UiSelectField>

      <!-- Where the initial supply and the capabilities go; blank means the connected wallet. -->
      <UiTextField id="recipient" v-model="form.recipient" label="Recipient" placeholder="0x…" :error="visibleError('recipient')" @blur="onBlur('recipient')">
        <template #label-suffix>
          <UiFieldHint field-id="recipient">
            The Sui address that receives the initial supply and every capability that is not given up: the TreasuryCap (mintable supply),
            the MetadataCap (updatable metadata) and the UpgradeCap (upgradeable package). Leave blank to send everything to the connected
            wallet. Enter a different address to separate the deployer wallet from the custody wallet.
          </UiFieldHint>
        </template>
      </UiTextField>

      <!-- The licence of the downloadable source package (not of the on-chain coin). -->
      <LicensePicker v-model="form.license" @name="form.licenseName = $event" />
    </fieldset>

    <!-- Back and next; the last step reads "Review & deploy". -->
    <p class="actions">
      <!-- Back is offered after the first step. -->
      <UiButton v-if="formStep !== 'identity'" variant="ghost" @click="emit('back')">Back</UiButton>
      <!-- The last step reads "Review & deploy"; the button is disabled until the step has no error. -->
      <UiButton type="submit" :disabled="!canProceed">{{ formStep === 'settings' ? 'Review & deploy' : 'Next' }}</UiButton>
    </p>
  </form>
</template>

<style scoped>
/* A fieldset has no border or padding of its own; its legend is the step title. */
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
/* Two fields side by side on a wide screen, one column on a narrow one. */
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
/* "Permanent" is drawn in the danger colour and bold, so it is not missed. */
.permanent {
  color: var(--danger);
  font-weight: var(--font-weight-semibold);
}
/* Muted secondary text. */
.note {
  color: var(--muted);
}
/* The coin-type preview is muted secondary text. */
.preview {
  color: var(--muted);
  font-size: var(--font-size-sm);
}
/* The buttons wrap. */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}
</style>
