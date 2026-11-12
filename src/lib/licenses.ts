// The licence catalogue, vendored in the app: the SPDX texts come from the `spdx-license-list` package (CC0-1.0) through
// `scripts/gen-licenses.mjs` into `license-texts.json`, so choosing or reading a licence makes no request to any other origin. Licence
// choice only affects the downloadable package (LICENSE file + Move.toml/README/source header), never the on-chain bytecode.

export interface SpdxLicense {
  id: string
  name: string
  osiApproved: boolean
  deprecated: boolean
}

/** The "no license" / proprietary choice; it has no text. */
export const NO_LICENSE: SpdxLicense = {
  id: 'NONE',
  name: 'None / proprietary (all rights reserved)',
  osiApproved: false,
  deprecated: false,
}

/** Ids surfaced first in the picker. 0BSD is the project default; CC0 stays available. */
export const POPULAR_LICENSE_IDS = [
  '0BSD',
  'MIT',
  'Apache-2.0',
  'BSD-3-Clause',
  'BSD-2-Clause',
  'GPL-3.0-only',
  'GPL-2.0-only',
  'LGPL-3.0-only',
  'AGPL-3.0-only',
  'MPL-2.0',
  'ISC',
  'Unlicense',
  'CC0-1.0',
] as const

export const DEFAULT_LICENSE_ID = '0BSD'

/** SPDX ids are limited to these characters; anything else is rejected. */
const LICENSE_ID_RE = /^[A-Za-z0-9.\-+]+$/

type Texts = Record<string, { name: string; osiApproved: boolean; text: string }>

export interface LicenseCatalogue {
  /** Popular licenses first (in POPULAR order), each also present in `all`. */
  popular: SpdxLicense[]
  /** Every offered license, alphabetical by id, prefixed with NO_LICENSE. */
  all: SpdxLicense[]
}

let textsPromise: Promise<Texts> | null = null

// The texts are a separate chunk (a few hundred KiB), loaded the first time a licence is listed or read.
function loadTexts(): Promise<Texts> {
  textsPromise ??= import('./license-texts.json').then((m) => (m.default ?? m) as Texts)
  return textsPromise
}

/** The licences the picker offers. */
export async function loadLicenseCatalogue(): Promise<LicenseCatalogue> {
  const texts = await loadTexts()
  const list: SpdxLicense[] = Object.entries(texts)
    .map(([id, l]) => ({ id, name: l.name, osiApproved: l.osiApproved, deprecated: false }))
    .sort((a, b) => a.id.localeCompare(b.id))
  const byId = new Map(list.map((l) => [l.id, l]))
  const popular = POPULAR_LICENSE_IDS.map((id) => byId.get(id)).filter((l): l is SpdxLicense => Boolean(l))
  return { popular, all: [NO_LICENSE, ...list] }
}

/**
 * The full text of an offered licence. Returns null for the proprietary/no-license choice (no LICENSE file should be written) and
 * throws for an id the app does not carry.
 */
export async function getLicenseText(id: string): Promise<string | null> {
  const key = id.trim()
  if (!key || ['none', 'unlicensed', 'noassertion'].includes(key.toLowerCase())) return null
  if (!LICENSE_ID_RE.test(key)) throw new Error(`invalid license id "${key}"`)
  const texts = await loadTexts()
  if (!Object.hasOwn(texts, key)) throw new Error(`no text for license "${key}"`)
  return texts[key]!.text
}
