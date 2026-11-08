<script setup lang="ts">
// The last look before deploying: what becomes permanent, what the policies allow, what is configured and what it costs.
import { computed } from 'vue'
import { UiButton, UiCard, UiNotice, UiStatGrid, UiStatRow } from '@meddleware/ui'
import { mistToSui } from '@meddleware/web-utils'
import type { TokenConfig, TokenNetwork as Network } from '@meddleware/token-issuance-client'
import { FEE_MIST, FEE_TREASURY, PUBLISH_GAS_BUDGET, ZERO_ADDR } from '../config.js'
import { changeableItems, permanentItems, policyStatements } from '../lib/policies.js'

// The fee, its recipient and the gas budget default to this build's configuration; they are props so the figures shown can be tested.
const props = withDefaults(
  defineProps<{ config: TokenConfig; network: Network; feeMist?: bigint; feeTreasury?: string; gasBudget?: bigint }>(),
  { feeMist: () => FEE_MIST, feeTreasury: (props) => FEE_TREASURY[props.network], gasBudget: () => PUBLISH_GAS_BUDGET },
)
defineEmits<{ (e: 'back'): void; (e: 'confirm'): void }>()

// Mirrors TokenIssuanceView: the fee is only charged when a real treasury is configured.
const feeCharged = computed(() => props.feeTreasury !== ZERO_ADDR && props.feeMist > 0n)
const permanent = computed(() => permanentItems(props.config))
const changeable = computed(() => changeableItems(props.config))
const statements = computed(() => policyStatements(props.config))
</script>

<template>
  <UiCard :level="2" :title="`Review — deploying to ${network}`">
    <UiNotice>
      <strong>Permanent once published</strong>, whatever you choose below:
      <template v-for="(item, i) in permanent" :key="item.term"
        ><template v-if="i">; </template>{{ item.term.toLowerCase() }} <code>{{ item.value }}</code></template
      >.
    </UiNotice>
    <p v-if="changeable.length">
      The {{ changeable.join(', ') }} can still be changed later by whoever holds the MetadataCap.
    </p>

    <UiStatGrid>
      <UiStatRow label="Initial supply" align="left">{{ config.initialSupply.toString() }}</UiStatRow>
      <UiStatRow v-for="s in statements" :key="s.id" :label="s.label" align="left">{{ s.choice }}</UiStatRow>
      <UiStatRow label="License (source only)" align="left">{{ config.license }}</UiStatRow>
      <UiStatRow label="Recipient" align="left">{{ config.recipient || 'your wallet' }}</UiStatRow>
    </UiStatGrid>

    <h3>What your choices mean</h3>
    <ul class="policies">
      <li v-for="s in statements" :key="s.id">
        <strong>{{ s.label }}: {{ s.choice }}.</strong> {{ s.text }}
      </li>
    </ul>

    <h3>Cost</h3>
    <p>
      Your wallet signs and pays network gas for the publish transaction (up to {{ mistToSui(gasBudget) }} SUI is set aside for it; only the
      gas actually used is charged) and for a second transaction that registers the coin.
      <template v-if="feeCharged">
        The publish transaction also pays a one-off fee of <strong>{{ mistToSui(feeMist) }} SUI</strong> to the Meddleware platform
        treasury, <code>{{ feeTreasury }}</code
        >. It is not refundable.
      </template>
      <template v-else>No Meddleware fee is charged on {{ network }}.</template>
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
.policies {
  margin: 0;
  padding-inline-start: var(--space-sm);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}
code {
  overflow-wrap: anywhere;
}
</style>
