// Regenerates src/lib/license-texts.json: the licence texts the picker offers, vendored from the `spdx-license-list` package
// (CC0-1.0, the full SPDX texts) so the app never asks another origin for a licence. Run `npm run gen:licenses` after changing OFFERED
// or upgrading the package; tests/licenseTexts.test.ts fails when the committed file differs from this output.
// `--stdout` prints the JSON instead of writing the file.
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../src/lib/license-texts.json', import.meta.url))

/** The licences the picker offers (besides "None"): the popular set first in the UI, then these. SPDX ids, not deprecated. */
export const OFFERED = [
  '0BSD',
  'MIT',
  'MIT-0',
  'Apache-2.0',
  'BSD-3-Clause',
  'BSD-3-Clause-Clear',
  'BSD-2-Clause',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'LGPL-2.1-only',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'MPL-2.0',
  'EUPL-1.2',
  'ISC',
  'Zlib',
  'BSL-1.0',
  'BlueOak-1.0.0',
  'Artistic-2.0',
  'Unlicense',
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
]

/** `{ [spdxId]: { name, osiApproved, text } }`, ids sorted, each text ending in exactly one newline. */
export function generate() {
  const full = createRequire(import.meta.url)('spdx-license-list/full.js')
  const out = {}
  for (const id of [...OFFERED].sort()) {
    const l = full[id]
    if (!l) throw new Error(`spdx-license-list has no "${id}"`)
    out[id] = { name: l.name, osiApproved: Boolean(l.osiApproved), text: `${l.licenseText.trimEnd()}\n` }
  }
  return `${JSON.stringify(out, null, 1)}\n`
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const json = generate()
  if (process.argv.includes('--stdout')) process.stdout.write(json)
  else {
    writeFileSync(OUT, json)
    console.log('wrote', OUT, `(${OFFERED.length} licences)`)
  }
}
