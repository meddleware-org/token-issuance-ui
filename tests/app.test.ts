import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('../src/wallet.js', () => ({
  useWallet: () => ({ account: { value: null }, disconnect: () => undefined }),
  getReadClient: () => ({}),
}))
vi.mock('../src/components/TokenIssuanceView.vue', () => ({ default: { template: '<p>tool</p>' } }))

import App from '../src/App.vue'

describe('the standalone shell', () => {
  it('uses the shared tool shell: the tool name as the page heading, the tool, the disclaimer and the footer links', () => {
    const w = mount(App)
    expect(w.get('h1').text()).toBe('Token Issuance')
    expect(w.text()).toContain('tool')
    const links = w.findAll('footer a').map((a) => a.attributes('href'))
    expect(links).toContain('https://docs.meddleware.co.uk/blockchain/sui/token-issuance/')
    // The developer site documents the coin template under /sui/onchain; there is no per-tool page to link to.
    expect(links).toContain('https://meddleware.dev/sui/onchain/token-issuance/overview')
  })

  it('shows the company mark beside the tool name in the header, as decoration', () => {
    const mark = mount(App).find('header svg.mw-brand-mark')
    expect(mark.exists()).toBe(true)
    expect(mark.attributes('aria-hidden')).toBe('true')
    expect(mark.find('path').attributes('fill')).toBe('currentColor')
  })

  it('gives the network select a visible label of its own, inside the header', () => {
    const w = mount(App)
    const label = w.get('header label.network')
    expect(label.text()).toMatch(/^Network/)
    const select = label.get('select')
    expect(select.findAll('option').map((o) => o.text())).toEqual(['testnet', 'mainnet'])
    expect(select.attributes('aria-label')).toBeUndefined()
  })

  it('states what stays permanent without claiming the name can never change', () => {
    const text = mount(App).get('.disclaimer').text().replace(/\s+/g, ' ')
    expect(text).toContain("symbol and decimals are permanent once published")
    expect(text).toContain('whether its name, description and icon can change depends on the metadata policy')
    expect(text).not.toMatch(/Symbol, name, and decimals are permanent/)
  })
})
