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
        All operations — bytecode compilation, transaction construction, and signing — take place
        entirely <strong>client-side</strong>, meaning on your computer. No code runs on our
        servers, and no server has any visibility into or control over what happens on your machine.
      </li>
      <li>
        This is a neutral, self-service tool. The operator does not review, approve, or endorse any
        token deployed with it.
      </li>
      <li>
        You are solely responsible for your token, its content, and its use — including compliance
        with all applicable laws in your jurisdiction.
      </li>
      <li>
        Please don't create tokens that misrepresent projects, impersonate other assets, or
        facilitate fraud. We can't actually see what you're doing from here, but we thought we'd
        mention it. Bad vibes.
      </li>
      <li>
        On-chain transactions are irreversible. Review your configuration carefully before
        confirming.
      </li>
      <li>
        The operator accepts no liability for financial loss, legal consequences, or any harm
        arising from your use of this tool.
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
