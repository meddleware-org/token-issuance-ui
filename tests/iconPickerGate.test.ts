import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// The icon picker against a gated operator relay: the pass price is read from the chain, the purchase button stays disabled until it is
// read, and no wallet prompt opens without it.
const { account, readClient, buildDeployExecutor } = vi.hoisted(() => ({
  account: { value: null as { address: string } | null },
  readClient: {
    getObject: vi.fn(async () => {
      throw new Error('node unreachable')
    }),
    listOwnedObjects: vi.fn(async () => ({ objects: [], hasNextPage: false, cursor: null })),
  },
  buildDeployExecutor: vi.fn(),
}))
// Build-time values (`import.meta.env`) cannot be stubbed after load, so the gate and the operator relay are supplied through the same
// parsers the app uses.
vi.mock('../src/config.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/config.js')>()
  return {
    ...real,
    accessGateFor: (net: 'testnet' | 'mainnet') =>
      net === 'testnet' ? real.parseAccessGate('testnet', { VITE_ACCESS_GATE_ID_TESTNET: '0x' + 'ab'.repeat(32) }) : null,
    WALRUS_RELAY_HOSTS: { testnet: 'https://relay.example.com', mainnet: 'https://upload-relay.mainnet.walrus.space' },
  }
})
vi.mock('../src/wallet.js', () => ({
  useWallet: () => ({ account }),
  signPersonalMessage: vi.fn(),
  getReadClient: () => readClient,
}))
vi.mock('../src/lib/deployExecutor.js', () => ({ buildDeployExecutor }))

describe('IconUploadPanel with a gated operator relay', () => {
  beforeEach(() => {
    vi.resetModules()
    account.value = { address: '0x' + '1'.repeat(64) }
    // The operator relay's tip-config answers (any JSON), so it is the relay on offer.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ send_tip: { address: '0x' + '2'.repeat(64), kind: { const: 1000 } } }), { status: 200 })))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    buildDeployExecutor.mockReset()
  })

  it('shows the purchase prompt, disabled while the price cannot be read, and never opens the wallet', async () => {
    const { default: IconUploadPanel } = await import('../src/components/IconUploadPanel.vue')
    const w = mount(IconUploadPanel, { props: { network: 'testnet', connected: true } })
    await flushPromises()
    // Pick a file so the panel shows the relay state.
    const input = w.find('input[type="file"]')
    const file = new File([new Uint8Array(10)], 'icon.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await flushPromises()
    await new Promise((r) => setTimeout(r, 20))
    await flushPromises()

    const cta = w.find('.wru-cta')
    expect(cta.exists()).toBe(true)
    expect(cta.text()).toContain('could not be read from the chain')
    const buy = cta.find('button')
    expect(buy.attributes('disabled')).toBeDefined()
    await buy.trigger('click')
    expect(buildDeployExecutor).not.toHaveBeenCalled()
    expect(w.text()).toContain('Read the price again')
  })
})
