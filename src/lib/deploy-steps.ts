// The deploy flow's steps as the progress list shows them: what each is called, and which are done, running or still ahead.
import type { DeployStep } from '@meddleware/token-issuance-client/deploy'
import type { StepperStep } from '@meddleware/ui'

const ORDER: { key: DeployStep; label: string }[] = [
  { key: 'patching', label: 'Preparing the module' },
  { key: 'publishing', label: 'Publishing (sign in your wallet)' },
  { key: 'confirming', label: 'Confirming on-chain' },
  { key: 'finalizing', label: 'Finalizing supply & caps (sign again)' },
  { key: 'confirming-finalize', label: 'Confirming finalize' },
  { key: 'done', label: 'Done' },
]

/** The list for the flow's current `step`: every earlier step done, that one running, the rest pending (all pending before it starts). */
export function deployStepStatuses(step: DeployStep | null): StepperStep[] {
  const current = ORDER.findIndex((s) => s.key === step)
  return ORDER.map((s, i) => ({
    id: s.key,
    label: s.label,
    status: current < 0 || i > current ? 'pending' : i < current ? 'done' : 'busy',
  }))
}
