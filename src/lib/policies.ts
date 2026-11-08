// What each policy choice means on the chain, in the words the wizard shows. One source for the form's hints, the review and the result,
// so the three cannot disagree, and a test ties each statement to the TokenConfig policy it describes.
//
// The facts come from the Move template (token-issuance-template-sui: `init` applies the supply and metadata policies in the publish
// transaction) and from the Sui framework's coin registry: `Currency` has setters for the name, the description and the icon URL, each
// gated by the MetadataCap, and none for the symbol or the decimals; deleting the MetadataCap ends the setters for good.
import type { MetadataPolicy, PackagePolicy, SupplyPolicy, TokenConfig } from '@meddleware/token-issuance-client'

/** Fixed at publish whatever the policies: the framework has no way to change them. */
export const ALWAYS_PERMANENT = ['symbol', 'decimals'] as const

/** Changeable by the MetadataCap holder until the cap is deleted (the `set_name`, `set_description` and `set_icon_url` setters). */
export const CHANGEABLE_WITH_METADATA_CAP = ['name', 'description', 'icon'] as const

/** The option label of each policy, as the form and the review show it. */
export const SUPPLY_LABELS: Record<SupplyPolicy, string> = { mintable: 'Mintable', fixed: 'Fixed' }
export const METADATA_LABELS: Record<MetadataPolicy, string> = { updatable: 'Updatable', frozen: 'Frozen' }
export const PACKAGE_LABELS: Record<PackagePolicy, string> = { immutable: 'Immutable', upgradeable: 'Upgradeable' }

/** What the supply choice does. */
export const SUPPLY_TEXT: Record<SupplyPolicy, string> = {
  mintable:
    'The TreasuryCap goes to the recipient. Whoever holds it can mint more coins at any time, and can burn coins.',
  fixed:
    'The whole supply is minted when the coin is created and the coin registry takes the TreasuryCap, so nobody can ever mint more. Wallets can see that. A fixed supply needs an initial supply above zero.',
}

/** What the metadata choice does. */
export const METADATA_TEXT: Record<MetadataPolicy, string> = {
  updatable:
    'The MetadataCap goes to the recipient. Whoever holds it can change the name, description and icon at any time. The symbol and decimals can never change.',
  frozen:
    'The MetadataCap is deleted when the coin is created, so the name, description and icon can never change either. Wallets can see that.',
}

/** What the package-code choice does. */
export const PACKAGE_TEXT: Record<PackagePolicy, string> = {
  immutable: 'The UpgradeCap is burned when the package is published, so its code can never change. Recommended for trust and auditability.',
  upgradeable: 'The UpgradeCap goes to the recipient. Whoever holds it can publish changed code for the package later.',
}

/** The statements for a whole config, in the order the review lists them. */
export function policyStatements(config: Pick<TokenConfig, 'supplyPolicy' | 'metadataPolicy' | 'packagePolicy'>): {
  id: 'supply' | 'metadata' | 'package'
  label: string
  choice: string
  text: string
}[] {
  return [
    { id: 'supply', label: 'Supply', choice: SUPPLY_LABELS[config.supplyPolicy], text: SUPPLY_TEXT[config.supplyPolicy] },
    { id: 'metadata', label: 'Metadata', choice: METADATA_LABELS[config.metadataPolicy], text: METADATA_TEXT[config.metadataPolicy] },
    { id: 'package', label: 'Package code', choice: PACKAGE_LABELS[config.packagePolicy], text: PACKAGE_TEXT[config.packagePolicy] },
  ]
}

/** What cannot change once the coin is published, for these choices: the identity plus the fields a frozen metadata policy locks. */
export function permanentItems(config: Pick<TokenConfig, 'symbol' | 'name' | 'decimals' | 'moduleName' | 'structName' | 'metadataPolicy'>): {
  term: string
  value: string
}[] {
  const items = [
    { term: 'Symbol', value: config.symbol },
    { term: 'Decimals', value: String(config.decimals) },
    { term: 'Coin type', value: `<package>::${config.moduleName}::${config.structName}` },
  ]
  if (config.metadataPolicy === 'frozen') items.splice(1, 0, { term: 'Name', value: config.name })
  return items
}

/** What the MetadataCap holder can still change after publishing (empty once the metadata is frozen). */
export function changeableItems(config: Pick<TokenConfig, 'metadataPolicy'>): readonly string[] {
  return config.metadataPolicy === 'updatable' ? CHANGEABLE_WITH_METADATA_CAP : []
}
