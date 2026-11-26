<script setup lang="ts">
// The coin's icon: a URL typed in, a file uploaded to Walrus, or a blob picked from those already stored. Whichever way, the result is a
// URL in the form's `iconUrl`. The three sources are tabs; the panels stay mounted so each keeps its state.
// Vue, the shared tab components and field, the token client's network type and the two source panels.
import { computed, ref } from 'vue'
import { AppTabNav, UiTabPanel, UiTextField, type AppTab } from '@meddleware/ui'
import type { TokenNetwork as Network } from '@meddleware/token-issuance-client'
import type { WalrusNetwork } from '../config.js'
import IconUploadPanel from './IconUploadPanel.vue'
import WalrusBlobBrowser from './WalrusBlobBrowser.vue'

const props = defineProps<{ network: Network; connected: boolean; error?: string }>()
const url = defineModel<string>({ required: true })
const emit = defineEmits<{ (e: 'blur'): void }>()

// Walrus has no localnet: there the icon can only be a URL.
const walrusNet = computed<WalrusNetwork | null>(() => (props.network === 'localnet' ? null : props.network))
// The tabs: a URL always, and the Walrus upload and browse tabs where Walrus exists.
const tabs = computed<AppTab[]>(() => [
  { id: 'url', label: 'URL' },
  ...(walrusNet.value ? [{ id: 'upload', label: 'Upload to Walrus' }, { id: 'browse', label: 'My Walrus blobs' }] : []),
])
// The chosen tab; a network switch can remove the one that is showing, so the shown tab falls back to URL.
const tab = ref('url')
// A network switch can remove the tab that is showing.
const shown = computed(() => (tabs.value.some((t) => t.id === tab.value) ? tab.value : 'url'))

/** picked(url): an uploaded or chosen blob's URL becomes the icon, and the URL tab is shown. */
function picked(picked: string): void {
  url.value = picked
  tab.value = 'url'
}
</script>

<template>
  <fieldset>
    <legend>Icon <span class="note">(optional)</span></legend>

    <!-- All panels stay mounted (v-show), so each keeps its state. -->
    <AppTabNav :model-value="shown" :tabs="tabs" id-prefix="icon" aria-label="Icon source" all-panels @update:model-value="tab = $event" />

    <UiTabPanel v-show="shown === 'url'" id-prefix="icon" tab="url">
      <UiTextField id="icon" v-model="url" type="url" label="Icon URL" placeholder="https://…" :error="error" @blur="emit('blur')" />
    </UiTabPanel>

    <template v-if="walrusNet">
      <UiTabPanel v-show="shown === 'upload'" id-prefix="icon" tab="upload">
        <!-- Keyed by network: the pass state and the relay belong to one network. -->
        <IconUploadPanel :key="walrusNet" :network="network" :connected="connected" @uploaded="picked" />
      </UiTabPanel>
      <UiTabPanel v-show="shown === 'browse'" id-prefix="icon" tab="browse">
        <!-- Choosing a blob fills in the icon URL. -->
        <WalrusBlobBrowser :network="walrusNet" :connected="connected" @select="picked" />
      </UiTabPanel>
    </template>
  </fieldset>
</template>

<style scoped>
/* A fieldset has no border or padding of its own. */
fieldset {
  margin: var(--space-sm) 0 0;
  padding: 0;
  border: 0;
}
/* The legend reads as the section's heading. */
legend {
  padding: 0;
  font-weight: var(--font-weight-semibold);
}
/* Muted secondary text. */
.note {
  color: var(--muted);
  font-weight: var(--font-weight-regular);
}
</style>
