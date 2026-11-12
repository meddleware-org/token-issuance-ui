// The committed licence texts (src/lib/license-texts.json) are exactly what `npm run gen:licenses` produces from the pinned
// `spdx-license-list` package, so they cannot drift or be edited by hand.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { POPULAR_LICENSE_IDS } from '../src/lib/licenses.js'

const root = join(import.meta.dirname, '..')
const committed = readFileSync(join(root, 'src', 'lib', 'license-texts.json'), 'utf8')

describe('license-texts.json', () => {
  it('equals the generator output', () => {
    const generated = execFileSync(process.execPath, [join(root, 'scripts', 'gen-licenses.mjs'), '--stdout'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    expect(committed === generated).toBe(true)
  })

  it('carries every popular licence', () => {
    const ids = Object.keys(JSON.parse(committed) as Record<string, unknown>)
    for (const id of POPULAR_LICENSE_IDS) expect(ids, id).toContain(id)
  })
})
