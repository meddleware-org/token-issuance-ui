<script setup lang="ts">
// The last look before deploying: what becomes permanent, what is configured, and what the fee is.
import { UiButton, UiCard, UiNotice, UiStatGrid, UiStatRow } from '@meddleware/ui'
import { mistToSui } from '@meddleware/web-utils'
import type { TokenConfig, TokenNetwork as Network } from '@meddleware/token-issuance-client'
import { FEE_MIST, FEE_TREASURY, isFeeConfigured } from '../config.js'

const props = defineProps<{ config: TokenConfig; network: Network }>()
defineEmits<{ (e: 'back'): void; (e: 'confirm'): void }>()

// Mirrors TokenIssuanceView: the fee is only charged when a real treasury is configured.
const feeCharged = isFeeConfigured(props.network)
const treasury = FEE_TREASURY[props.network]
</script>

<template>
  <UiCard :level="2" :title="`Review — deploying to ${network}`">
    <UiNotice>
      These values are <strong>permanent</strong> once published: symbol <code>{{ config.symbol }}</code
      >, name <code>{{ config.name }}</code
      >, decimals <code>{{ config.decimals }}</code
      >, and the coin type <code>&lt;package&gt;::{{ config.moduleName }}::{{ config.structName }}</code
      >.
    </UiNotice>

    <UiStatGrid>
      <UiStatRow label="Initial supply" align="left">{{ config.initialSupply.toString() }}</UiStatRow>
      <UiStatRow label="Supply policy" align="left">{{ config.supplyPolicy }}</UiStatRow>
      <UiStatRow label="Metadata" align="left">{{ config.metadataPolicy }}</UiStatRow>
      <UiStatRow label="Package code" align="left">{{ config.packagePolicy }}</UiStatRow>
      <UiStatRow label="License (source only)" align="left">{{ config.license }}</UiStatRow>
      <UiStatRow label="Recipient" align="left">{{ config.recipient || 'your wallet' }}</UiStatRow>
    </UiStatGrid>

    <p>
      Your wallet signs and pays gas.
      <template v-if="feeCharged">
        A one-off fee of <strong>{{ mistToSui(FEE_MIST) }} SUI</strong> is included in the publish transaction, paid to the operator treasury
        <code>{{ treasury }}</code
        >.
      </template>
      <template v-else>No fee is charged on this development network.</template>
      Nothing is compiled or signed on a server.
    </p>
    <p>
      You are the sole author of this token and fully responsible for its details and use. This tool does not review, verify, or endorse
      tokens or their creators, and takes no custody of your token or caps.
    </p>

    <p class="actions">
      <UiButton variant="ghost" @click="$emit('back')">Back</UiButton>
      <UiButton variant="primary" @click="$emit('confirm')">Confirm &amp; deploy</UiButton>
    </p>
  </UiCard>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}
code {
  overflow-wrap: anywhere;
}
</style>
