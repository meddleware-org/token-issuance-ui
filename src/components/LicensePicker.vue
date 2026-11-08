<script setup lang="ts">
// The licence of the downloadable source package: chosen from the SPDX list (popular ones first), with the licence text on demand.
import { computed, onMounted, ref } from 'vue'
import { UiButton, UiCodeBlock, UiDialog, UiFieldHint, UiFormField, UiLiveStatus, UiNotice, UiSelect } from '@meddleware/ui'
import { errorMessage, safeHref } from '@meddleware/web-utils'
import { fetchLicenseList, fetchLicenseText, NO_LICENSE, type SpdxLicense } from '../lib/licenses.js'

const model = defineModel<string>({ required: true })
const emit = defineEmits<{ (e: 'name', name: string): void }>()

const popular = ref<SpdxLicense[]>([])
const all = ref<SpdxLicense[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const allExceptNone = computed(() => all.value.filter((x) => x.id !== NO_LICENSE.id))
const currentLicenseName = computed(() => all.value.find((l) => l.id === model.value)?.name ?? model.value)

function announceName(id: string): void {
  const found = all.value.find((l) => l.id === id) ?? (id === NO_LICENSE.id ? NO_LICENSE : undefined)
  emit('name', found?.name ?? id)
}

const selectModel = computed({
  get: () => model.value,
  set: (id: string) => {
    model.value = id
    announceName(id)
  },
})

onMounted(async () => {
  try {
    const catalogue = await fetchLicenseList()
    popular.value = catalogue.popular
    all.value = catalogue.all
    announceName(model.value)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
})

// The licence text, in a dialog.
const open = ref(false)
const text = ref<string | null>(null)
const textLoading = ref(false)
const textError = ref<string | null>(null)

async function show(): Promise<void> {
  textError.value = null
  if (model.value !== NO_LICENSE.id) {
    textLoading.value = true
    try {
      text.value = await fetchLicenseText(model.value)
    } catch (e) {
      textError.value = errorMessage(e)
    } finally {
      textLoading.value = false
    }
  }
  open.value = true
}
</script>

<template>
  <UiFormField id="license-select" label="License">
    <template #label-suffix>
      <UiFieldHint field-id="license-select">
        Applies only to the downloadable Move source package — embedded in the LICENSE file and source headers. Has
        <strong>no effect on the on-chain token</strong> or its transferability. Choose <code>0BSD</code> (default) for a minimal permissive
        license, or <code>CC0-1.0</code> for public domain. Choose <code>None</code> to retain all rights.
      </UiFieldHint>
    </template>
    <template #default="{ attrs }">
      <span class="row">
        <UiSelect
          :id="attrs.id"
          v-model="selectModel"
          :disabled="loading || Boolean(error)"
          :aria-invalid="attrs['aria-invalid']"
          :aria-describedby="[attrs['aria-describedby'], 'license-load-status'].filter(Boolean).join(' ')"
        >
          <option :value="NO_LICENSE.id" :title="NO_LICENSE.name">{{ NO_LICENSE.id }}</option>
          <optgroup v-if="popular.length" label="Popular">
            <option v-for="l in popular" :key="'p-' + l.id" :value="l.id" :title="`${l.id} — ${l.name}`">{{ l.id }}</option>
          </optgroup>
          <optgroup v-if="all.length" label="All licenses">
            <option v-for="l in allExceptNone" :key="l.id" :value="l.id" :title="`${l.id} — ${l.name}`">{{ l.id }}</option>
          </optgroup>
        </UiSelect>
        <UiButton variant="secondary" :disabled="loading" @click="show">View</UiButton>
      </span>
    </template>
  </UiFormField>
  <UiLiveStatus id="license-load-status" label="Licenses" :message="loading ? 'Loading licenses from SPDX…' : ''" />
  <UiNotice v-if="error" type="error" :message="`Couldn't load the license list: ${error}`" />

  <UiDialog v-model:open="open" :title="currentLicenseName" width="min(680px, 92vw)">
    <UiLiveStatus label="License text" :message="textLoading ? 'Loading…' : ''" />
    <UiNotice v-if="textError" type="error" :message="textError" />
    <p v-else-if="model === NO_LICENSE.id">No LICENSE file will be generated. All rights are reserved by the author.</p>
    <template v-else-if="!textLoading">
      <p>
        <a :href="safeHref(`https://spdx.org/licenses/${encodeURIComponent(model)}.html`)" target="_blank" rel="noopener noreferrer">View on SPDX ↗</a>
      </p>
      <UiCodeBlock :code="text ?? ''" label="License text" wrap />
    </template>
    <template #actions="{ close }">
      <UiButton variant="secondary" @click="close()">Close</UiButton>
    </template>
  </UiDialog>
</template>

<style scoped>
.row {
  display: flex;
  gap: var(--space-2xs);
  align-items: center;
}
.row :deep(.mw-select) {
  flex: 1;
}
</style>
