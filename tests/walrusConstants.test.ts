import { describe, expect, it } from 'vitest'
import { EPOCH_DAYS, ICON_EPOCHS, iconStorageLabel } from '../src/lib/walrus-constants.js'

describe('how long an icon is stored', () => {
  it('uses the Walrus epoch lengths: two weeks on mainnet, one day on testnet', () => {
    expect(EPOCH_DAYS).toEqual({ mainnet: 14, testnet: 1 })
    expect(ICON_EPOCHS).toBe(53)
  })

  it('says about two years on mainnet', () => {
    expect(iconStorageLabel('mainnet')).toBe('about 2 years')
  })

  it('says days on testnet, and that testnet can be reset, instead of claiming years', () => {
    const label = iconStorageLabel('testnet')
    expect(label).toContain('about 53 days')
    expect(label).toContain('testnet can be reset at any time')
    expect(label).not.toMatch(/years/)
  })
})
