import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { mistToSui } from '@meddleware/web-utils'
import type { TokenConfig } from '@meddleware/token-issuance-client'
import ReviewPanel from '../src/components/ReviewPanel.vue'
import { FEE_MIST, PUBLISH_GAS_BUDGET, ZERO_ADDR } from '../src/config.js'
import { emptyForm, toTokenConfig } from '../src/lib/form.js'

const TREASURY = '0x' + '7'.repeat(64)
const form = { ...emptyForm(), packageName: 'my_token', moduleName: 'mytoken', symbol: 'MYT', name: 'My Token', initialSupply: '10' }
const config: TokenConfig = toTokenConfig(form)
const text = (w: ReturnType<typeof mount>): string => w.text().replace(/\s+/g, ' ')

describe('the review states the fee and who receives it', () => {
  it('writes the exact fee in SUI from the fee in MIST, and the recipient address', () => {
    const w = mount(ReviewPanel, { props: { config, network: 'testnet', feeMist: 2_500_000_001n, feeTreasury: TREASURY, gasBudget: 500_000_000n } })
    const page = text(w)
    expect(page).toContain('one-off fee of 2.500000001 SUI')
    expect(page).toContain('Meddleware platform treasury')
    expect(page).toContain(TREASURY)
    expect(page).toContain('not refundable')
    expect(page).toContain('up to 0.5 SUI is set aside')
    expect(w.find('strong:not(:empty)').exists()).toBe(true)
  })

  it('uses the configured default fee when none is passed (the build default is 2 SUI)', () => {
    const w = mount(ReviewPanel, { props: { config, network: 'testnet', feeTreasury: TREASURY } })
    expect(text(w)).toContain(`one-off fee of ${mistToSui(FEE_MIST)} SUI`)
    expect(text(w)).toContain(`up to ${mistToSui(PUBLISH_GAS_BUDGET)} SUI is set aside`)
    expect(FEE_MIST).toBe(2_000_000_000n)
  })

  it('names no fee where no treasury is set', () => {
    const page = text(mount(ReviewPanel, { props: { config, network: 'localnet', feeTreasury: ZERO_ADDR } }))
    expect(page).toContain('No Meddleware fee is charged on localnet')
    expect(page).not.toContain('one-off fee')
  })

  it('never calls the treasury an operator treasury', () => {
    const page = text(mount(ReviewPanel, { props: { config, network: 'testnet', feeTreasury: TREASURY } }))
    expect(page).not.toMatch(/operator/i)
  })
})
