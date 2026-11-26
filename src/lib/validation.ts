// The form layer: turns the token rules from @meddleware/token-issuance-client into per-field messages for
// the UI. The rules themselves (identifiers, safe text, icon schemes, decimals, supply bounds) live
// in the client, which also enforces them with assertTokenConfig before any deploy or generation.

import {
  MAX_U64,
  SAFE_TEXT,
  TOKEN_LIMITS,
  hasAllowedIconScheme,
  isValidDecimals,
  parseSupply,
  validateModuleName,
  validatePackageName,
  type TokenConfig,
} from '@meddleware/token-issuance-client'

export { deriveStructName, parseSupply } from '@meddleware/token-issuance-client'

/** A full Sui address: 0x and 64 hex digits. */
const SUI_ADDRESS = /^0x[0-9a-fA-F]{64}$/

/** A message per field that failed validation. */
export type FormErrors = Partial<Record<keyof TokenConfig, string>>

/** The form fields validation reads (all text, as the inputs hold them). */
export interface ValidatableForm {
  packageName: string
  moduleName: string
  symbol: string
  name: string
  description: string
  iconUrl: string
  decimals: number | string
  initialSupply: string
  /** When 'fixed', an initial supply above zero is required (the framework refuses to fix an empty supply). */
  supplyPolicy?: 'mintable' | 'fixed'
  recipient: string
}

/** The message for free text that is empty (when required), too long or holds characters the Move source cannot carry. */
function textError(value: string, max: number, required: boolean): string | undefined {
  if (required && !value.trim()) return 'Required'
  if (value.length > max) return `Maximum ${max} characters`
  if (!SAFE_TEXT.test(value)) return 'Double quotes and backslashes are not supported'
  return undefined
}

/** Validate the user-entered fields. Returns a map of field → message. */
export function validateForm(form: ValidatableForm): FormErrors {
  // Collect a message per field.
  const errors: FormErrors = {}

  // The package and module names follow the Move identifier rules the client enforces.
  const packageNameError = validatePackageName(form.packageName)
  if (packageNameError) errors.packageName = packageNameError
  const moduleNameError = validateModuleName(form.moduleName)
  if (moduleNameError) errors.moduleName = moduleNameError

  // Free text: required where it must be, within its length, and free of characters the Move source cannot carry.
  const symbol = textError(form.symbol, TOKEN_LIMITS.symbol, true)
  if (symbol) errors.symbol = symbol
  const name = textError(form.name, TOKEN_LIMITS.name, true)
  if (name) errors.name = name
  const description = textError(form.description, TOKEN_LIMITS.description, false)
  if (description) errors.description = description
  // The icon is optional; if given it must be https or ipfs.
  if (form.iconUrl) {
    const icon = textError(form.iconUrl, TOKEN_LIMITS.iconUrl, false)
    if (icon) errors.iconUrl = icon
    else if (!hasAllowedIconScheme(form.iconUrl)) errors.iconUrl = 'Use an https:// or ipfs:// URL'
  }

  // Decimals: a whole number within the limits.
  const decimals = Number(form.decimals)
  if (!Number.isInteger(decimals)) errors.decimals = 'Enter a whole number'
  else if (decimals < TOKEN_LIMITS.decimals.min) errors.decimals = `Must be ${TOKEN_LIMITS.decimals.min} or greater`
  else if (decimals > TOKEN_LIMITS.decimals.max) errors.decimals = `Maximum is ${TOKEN_LIMITS.decimals.max} (9 is typical on Sui)`

  // The initial supply: whole tokens, within what fits in a 64-bit amount at the chosen precision; a fixed supply needs a positive one.
  const supply = parseSupply(form.initialSupply)
  if (supply === null) {
    errors.initialSupply = 'Enter a whole number, or leave blank for none'
  } else if (isValidDecimals(decimals) && supply * 10n ** BigInt(decimals) > MAX_U64) {
    errors.initialSupply = 'Supply exceeds the maximum for this decimal precision'
  } else if (form.supplyPolicy === 'fixed' && supply === 0n) {
    errors.initialSupply = 'A fixed supply needs an initial supply above zero'
  }

  // The recipient, if given, must be a full Sui address.
  if (form.recipient && !SUI_ADDRESS.test(form.recipient)) {
    errors.recipient = 'Enter a full Sui address (0x followed by 64 hex digits)'
  }

    // Hand the messages back.
  return errors
}

/** Whether a validation result holds no error. */
export function isValid(errors: FormErrors): boolean {
  return Object.keys(errors).length === 0
}
