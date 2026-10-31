import { describe, expect, it } from 'vitest'
import { deployStepStatuses } from '../src/lib/deploy-steps.js'

const status = (step: Parameters<typeof deployStepStatuses>[0]) => deployStepStatuses(step).map((s) => s.status)

describe('deployStepStatuses', () => {
  it('has every step pending before the flow starts', () => {
    expect(status(null)).toEqual(Array(6).fill('pending'))
  })

  it('marks the earlier steps done, the current one busy, and the rest pending', () => {
    expect(status('publishing')).toEqual(['done', 'busy', 'pending', 'pending', 'pending', 'pending'])
    expect(status('confirming-finalize')).toEqual(['done', 'done', 'done', 'done', 'busy', 'pending'])
  })

  it('names the steps for the person waiting on them', () => {
    expect(deployStepStatuses('patching').map((s) => s.label)).toEqual([
      'Preparing the module',
      'Publishing (sign in your wallet)',
      'Confirming on-chain',
      'Finalizing supply & caps (sign again)',
      'Confirming finalize',
      'Done',
    ])
  })
})
