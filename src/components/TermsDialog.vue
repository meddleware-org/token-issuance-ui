<script setup lang="ts">
// Pre-deploy terms, in the shared UiDialog. Closing by any route (Cancel, Escape, backdrop,
// close button) counts as cancel; only the "continue" action accepts — UiDialog's return value
// tells them apart.
import { UiButton, UiDialog } from '@meddleware/ui'

defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'accept'): void
  (e: 'cancel'): void
}>()

function onClose(returnValue: string): void {
  if (returnValue === 'accept') emit('accept')
  else emit('cancel')
}
</script>

<template>
  <UiDialog :open="open" title="Before you deploy" @close="onClose">
    <!-- A list: each item is a discrete, parallel term (announced with an item count). -->
    <ul class="terms">
      <li>
        Your coin's code is prepared, and its transactions are built and signed, <strong>in your browser</strong> with your wallet. No code is
        compiled on a server and no server holds your keys. Your browser does talk to Sui network nodes and, if you upload an icon, to a
        Walrus upload relay.
      </li>
      <li>
        This is a neutral, self-service tool. Meddleware does not review, approve, or endorse any token created with it.
      </li>
      <li>
        You are solely responsible for your token, its content, and its use, including compliance with all laws that apply to you.
      </li>
      <li>
        Do not use this tool to create tokens that misrepresent a project, impersonate another asset, or facilitate fraud.
      </li>
      <li>
        On-chain transactions are irreversible, and so are the fee and the gas they pay. Some choices in your configuration can never be
        undone either; the next screen lists them. Review it carefully before confirming.
      </li>
      <li>
        Meddleware accepts no liability for financial loss, legal consequences, or any harm arising from your use of this tool.
      </li>
    </ul>
    <p class="terms__confirm">
      By continuing, you confirm that you have read and accept these terms.
    </p>
    <template #actions="{ close }">
      <UiButton variant="primary" @click="close('accept')">I understand — continue</UiButton>
      <UiButton variant="secondary" @click="close('cancel')">Cancel</UiButton>
    </template>
  </UiDialog>
</template>

<style scoped>
.terms {
  margin: 0;
  padding-inline-start: var(--space-sm);
  line-height: var(--leading-relaxed);
}
.terms li + li {
  margin-top: var(--space-2xs);
}
.terms__confirm {
  margin: var(--space-xs) 0 0;
  color: var(--muted);
  font-size: var(--font-size-sm);
}
</style>
