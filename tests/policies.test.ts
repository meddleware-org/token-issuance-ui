import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { MetadataPolicy, PackagePolicy, PublishResult, SupplyPolicy, TokenConfig } from '@meddleware/token-issuance-client'
import ConfigForm from '../src/components/ConfigForm.vue'
import ResultPanel from '../src/components/ResultPanel.vue'
import ReviewPanel from '../src/components/ReviewPanel.vue'
import { emptyForm } from '../src/lib/form.js'
import {
  ALWAYS_PERMANENT,
  CHANGEABLE_WITH_METADATA_CAP,
  changeableItems,
  METADATA_TEXT,
  PACKAGE_TEXT,
  permanentItems,
  policyStatements,
  SUPPLY_TEXT,
} from '../src/lib/policies.js'

const SUPPLY: SupplyPolicy[] = ['mintable', 'fixed']
const METADATA: MetadataPolicy[] = ['updatable', 'frozen']
const PACKAGE: PackagePolicy[] = ['immutable', 'upgradeable']

const config = (supplyPolicy: SupplyPolicy, metadataPolicy: MetadataPolicy, packagePolicy: PackagePolicy): TokenConfig => ({
  packageName: 'my_token',
  moduleName: 'mytoken',
  structName: 'MYTOKEN',
  symbol: 'MYT',
  name: 'My Token',
  description: 'A test coin',
  iconUrl: '',
  decimals: 6,
  initialSupply: 1000n,
  supplyPolicy,
  metadataPolicy,
  packagePolicy,
  recipient: '',
  license: '0BSD',
  licenseName: 'BSD Zero Clause License',
  packageDescription: 'Official MYT token.',
  projectName: 'My Token',
})

/** Every combination of the three policies. */
const COMBOS = SUPPLY.flatMap((s) => METADATA.flatMap((m) => PACKAGE.map((p) => [s, m, p] as const)))

describe('what the chain allows (src/lib/policies.ts)', () => {
  it('makes the symbol and decimals permanent and nothing else, whatever the policies', () => {
    expect(ALWAYS_PERMANENT).toEqual(['symbol', 'decimals'])
    // The framework's setters gated by the MetadataCap: set_name, set_description, set_icon_url (none exists for the symbol or decimals).
    expect(CHANGEABLE_WITH_METADATA_CAP).toEqual(['name', 'description', 'icon'])
    for (const field of ALWAYS_PERMANENT) expect(CHANGEABLE_WITH_METADATA_CAP).not.toContain(field)
  })

  it('lists what can still change exactly when the metadata is updatable', () => {
    expect(changeableItems({ metadataPolicy: 'updatable' })).toEqual(['name', 'description', 'icon'])
    expect(changeableItems({ metadataPolicy: 'frozen' })).toEqual([])
  })

  it('adds the name to the permanent facts exactly when the metadata is frozen', () => {
    const terms = (m: MetadataPolicy) => permanentItems(config('mintable', m, 'immutable')).map((i) => i.term)
    expect(terms('updatable')).toEqual(['Symbol', 'Decimals', 'Coin type'])
    expect(terms('frozen')).toEqual(['Symbol', 'Name', 'Decimals', 'Coin type'])
  })

  it('names the capability each policy keeps, hands over or gives up', () => {
    expect(SUPPLY_TEXT.mintable).toMatch(/TreasuryCap goes to the recipient/)
    expect(SUPPLY_TEXT.fixed).toMatch(/registry takes the TreasuryCap/)
    expect(SUPPLY_TEXT.fixed).toMatch(/nobody can ever mint more/)
    expect(METADATA_TEXT.updatable).toMatch(/MetadataCap goes to the recipient/)
    expect(METADATA_TEXT.updatable).toMatch(/change the name, description and icon/)
    expect(METADATA_TEXT.updatable).toMatch(/symbol and decimals can never change/)
    expect(METADATA_TEXT.frozen).toMatch(/MetadataCap is deleted/)
    expect(METADATA_TEXT.frozen).toMatch(/name, description and icon can never change/)
    expect(PACKAGE_TEXT.immutable).toMatch(/UpgradeCap is burned/)
    expect(PACKAGE_TEXT.upgradeable).toMatch(/UpgradeCap goes to the recipient/)
  })

  it('says the symbol and decimals can never change wherever it mentions them, and the name is not changeable once frozen', () => {
    expect(METADATA_TEXT.updatable).toMatch(/symbol and decimals can never change/)
    expect(METADATA_TEXT.frozen).not.toMatch(/symbol|decimals/)
    expect(METADATA_TEXT.frozen).not.toMatch(/can (still )?change/)
  })

  it.each(COMBOS)('describes %s supply, %s metadata and %s package code from the config', (s, m, p) => {
    const statements = policyStatements(config(s, m, p))
    expect(statements.map((x) => x.id)).toEqual(['supply', 'metadata', 'package'])
    expect(statements.map((x) => x.text)).toEqual([SUPPLY_TEXT[s], METADATA_TEXT[m], PACKAGE_TEXT[p]])
  })
})

describe('the wizard shows those statements', () => {
  it.each(COMBOS)('the review for %s / %s / %s shows its own statements and none of the others', (s, m, p) => {
    const text = mount(ReviewPanel, { props: { config: config(s, m, p), network: 'testnet', feeMist: 0n, feeTreasury: '0x' + '0'.repeat(64) } }).text()
    const squash = (t: string): string => t.replace(/\s+/g, ' ')
    const page = squash(text)
    for (const [policy, table, chosen] of [
      ['supply', SUPPLY_TEXT, s],
      ['metadata', METADATA_TEXT, m],
      ['package', PACKAGE_TEXT, p],
    ] as const) {
      for (const [key, value] of Object.entries(table)) {
        expect(page.includes(squash(value)), `${policy}: ${key} when ${chosen} is chosen`).toBe(key === chosen)
      }
    }
    // The permanent block.
    expect(page).toContain('Permanent once published')
    expect(page).toContain('MYT')
    expect(page.includes('can still be changed later by whoever holds the MetadataCap')).toBe(m === 'updatable')
    expect(page.includes('My Token')).toBe(m === 'frozen')
  })

  it('shows the hint under each policy select for the chosen option and updates it when the choice changes', async () => {
    const form = emptyForm()
    const w = mount(ConfigForm, {
      props: { form, errors: {}, canProceed: true, network: 'testnet', connected: true, formStep: 'settings' },
      global: { stubs: { LicensePicker: true } },
    })
    const hint = (id: string): string => w.get(`#${id}-hint-text`).text()
    expect(hint('supply-policy')).toBe(SUPPLY_TEXT.mintable)
    expect(hint('metadata-policy')).toBe(METADATA_TEXT.updatable)
    expect(hint('package-policy')).toBe(PACKAGE_TEXT.immutable)
    await w.get('#supply-policy').setValue('fixed')
    await w.get('#metadata-policy').setValue('frozen')
    await w.get('#package-policy').setValue('upgradeable')
    expect(hint('supply-policy')).toBe(SUPPLY_TEXT.fixed)
    expect(hint('metadata-policy')).toBe(METADATA_TEXT.frozen)
    expect(hint('package-policy')).toBe(PACKAGE_TEXT.upgradeable)
  })

  it('says in the name and symbol hints what the chain allows for each', () => {
    const w = mount(ConfigForm, {
      props: { form: emptyForm(), errors: {}, canProceed: true, network: 'testnet', connected: true, formStep: 'token' },
      global: { stubs: { IconPicker: true } },
    })
    const name = w.get('#token-name-hint').text()
    expect(name).toMatch(/Updatable metadata policy the MetadataCap holder can change it later/)
    expect(name).toMatch(/Frozen it is permanent/)
    const symbol = w.get('#token-symbol-hint').text()
    expect(symbol).toMatch(/symbol can never change/)
    expect(w.get('#token-decimals-hint').text()).toMatch(/can never change/)
    expect(w.get('#token-description-hint').text()).toMatch(/MetadataCap holder can change it later unless the metadata is frozen/)
  })

  it.each(COMBOS)('the result for %s / %s / %s shows its own statements and the caps that exist', (s, m, p) => {
    const result: PublishResult = {
      packageId: '0x' + 'a'.repeat(64),
      coinType: `0x${'a'.repeat(64)}::mytoken::MYTOKEN`,
      network: 'testnet',
      digest: 'D',
      treasuryCapId: s === 'mintable' ? '0x' + 'b'.repeat(64) : undefined,
      metadataCapId: m === 'updatable' ? '0x' + 'c'.repeat(64) : undefined,
      upgradeCapId: p === 'upgradeable' ? '0x' + 'd'.repeat(64) : undefined,
    } as PublishResult
    const w = mount(ResultPanel, { props: { result, config: config(s, m, p) }, global: { stubs: { GithubPush: true } } })
    const text = w.text().replace(/\s+/g, ' ')
    const html = w.html()
    expect(text).toContain(SUPPLY_TEXT[s].replace(/\s+/g, ' '))
    expect(text).toContain(METADATA_TEXT[m].replace(/\s+/g, ' '))
    expect(text).toContain(PACKAGE_TEXT[p].replace(/\s+/g, ' '))
    expect(text.includes('UpgradeCap')).toBe(true) // named in the package statement either way
    expect(html.includes('Copy upgrade cap id')).toBe(p === 'upgradeable')
    expect(html.includes('Copy treasury cap id')).toBe(s === 'mintable')
    expect(html.includes('Copy metadata cap id')).toBe(m === 'updatable')
  })
})
