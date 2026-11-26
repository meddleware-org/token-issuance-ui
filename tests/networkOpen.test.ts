// Which networks are open for deployment (src/config.ts): a network opens only when its fee treasury is set, so a deploy can never skip the fee.
import { describe, expect, it } from 'vitest'
import { isNetworkOpen } from '../src/config.js'

const ZERO = '0x' + '0'.repeat(64)
const TREASURY = '0x' + '7'.repeat(64)

describe('which networks are open for deployment', () => {
  // Keeps a real network closed while its fee treasury is unset, so a missing value is never a free deployment.
  it('keeps a real network closed while its fee treasury is unset, so a missing value is never a free deployment', () => {
    const none = { testnet: ZERO, mainnet: ZERO, localnet: ZERO }
    expect(isNetworkOpen('testnet', none)).toBe(false)
    expect(isNetworkOpen('mainnet', none)).toBe(false)
  })
  // Opens exactly the networks that have a treasury.
  it('opens exactly the networks that have a treasury', () => {
    const t = { testnet: TREASURY, mainnet: ZERO, localnet: ZERO }
    expect(isNetworkOpen('testnet', t)).toBe(true)
    expect(isNetworkOpen('mainnet', t)).toBe(false)
  })
  it('always opens localnet (a developer network with no fee)', () => {
    expect(isNetworkOpen('localnet', { testnet: ZERO, mainnet: ZERO, localnet: ZERO })).toBe(true)
  })
})
