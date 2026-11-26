// The reactive form model (all text inputs are strings) and its conversion into
// the strongly-typed TokenConfig used by the deploy + generate pipelines.

// The typed configuration the deploy and generate pipelines use, and the helpers this module converts with.
import type { MetadataPolicy, PackagePolicy, SupplyPolicy, TokenConfig } from '@meddleware/token-issuance-client'
import { deriveStructName, parseSupply } from './validation.js'
import { DEFAULT_LICENSE_ID } from './licenses.js'

/**
 * The reactive form state. Every field is a string (as bound to inputs); it is
 * converted to the strongly-typed {@link TokenConfig} by {@link toTokenConfig}.
 */
export interface FormModel {
  packageName: string
  moduleName: string
  symbol: string
  name: string
  description: string
  iconUrl: string
  decimals: string
  initialSupply: string
  supplyPolicy: SupplyPolicy
  metadataPolicy: MetadataPolicy
  packagePolicy: PackagePolicy
  recipient: string
  license: string
  licenseName: string
  packageDescription: string
  projectName: string
}

/** A blank form with the recommended safe defaults pre-selected. */
export function emptyForm(): FormModel {
  return {
    packageName: '',
    moduleName: '',
    symbol: '',
    name: '',
    description: '',
    iconUrl: '',
    // Nine decimals is the Sui convention.
    decimals: '9',
    initialSupply: '',
    // The defaults for the three policies: mintable supply, updatable metadata, immutable package.
    supplyPolicy: 'mintable',
    metadataPolicy: 'updatable',
    packagePolicy: 'immutable',
    recipient: '',
    // The default licence for the source package.
    license: DEFAULT_LICENSE_ID,
    licenseName: '',
    packageDescription: '',
    projectName: '',
  }
}

/** Convert the form into a TokenConfig. `recipient` empty means the connected wallet. */
export function toTokenConfig(form: FormModel): TokenConfig {
  // The struct name is derived from the module name, so the two cannot disagree.
  const structName = deriveStructName(form.moduleName)
  return {
    // Text fields are trimmed.
    packageName: form.packageName.trim(),
    moduleName: form.moduleName.trim(),
    structName,
    symbol: form.symbol.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    iconUrl: form.iconUrl.trim(),
    // Numbers and big integers are parsed here, once, from the strings the inputs hold; an unparsable supply becomes zero (validation has already refused it).
    decimals: Number(form.decimals),
    initialSupply: parseSupply(form.initialSupply) ?? 0n,
    supplyPolicy: form.supplyPolicy,
    metadataPolicy: form.metadataPolicy,
    packagePolicy: form.packagePolicy,
    recipient: form.recipient.trim(),
    license: form.license,
    // Defaults for the optional descriptive fields.
    licenseName: form.licenseName || form.license,
    packageDescription: form.packageDescription.trim() || `Official ${form.symbol} token.`,
    projectName: form.projectName.trim() || form.name,
  }
}
