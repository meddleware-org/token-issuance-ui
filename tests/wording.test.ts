import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The words on the page follow the reader (D117): no "operator", no build variable or script name, the one spelling of the company name,
// no placeholder, no joke in the terms, and semantic emphasis (<strong>, <code>, <dfn>) rather than <b>, with no <br> for layout.
const SRC = join(__dirname, '..', 'src')
const files = [join(SRC, 'App.vue'), ...readdirSync(join(SRC, 'components')).filter((f) => f.endsWith('.vue')).map((f) => join(SRC, 'components', f))]

/** The text of an SFC's top-level template, without HTML comments (which are for developers). */
function template(path: string): string {
  const source = readFileSync(path, 'utf8')
  const start = source.indexOf('<template>')
  const end = source.lastIndexOf('</template>')
  return source.slice(start, end).replace(/<!--[\s\S]*?-->/g, '')
}

const BANNED: [string, RegExp][] = [
  ['"operator"', /\boperator\b/i],
  ['a build variable name', /VITE_[A-Z_]+/],
  ['a script name', /npm run|\.mjs\b|\.env\b/],
  ['the MeddleWare spelling', /MeddleWare/],
  ['a placeholder', /coming soon|bad vibes/i],
  ['<b>', /<b[\s>]/],
  ['<br>', /<br\s*\/?>/],
]

describe('user-visible wording', () => {
  it.each(files.map((f) => [f.slice(SRC.length + 1), f]))('%s', (_name, path) => {
    const text = template(path)
    for (const [what, pattern] of BANNED) expect(text, `${what} in ${_name}`).not.toMatch(pattern)
  })

  it('has components to check', () => {
    expect(files.length).toBeGreaterThan(8)
  })

  it('keeps the index page spelling of the company name', () => {
    const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8')
    expect(html).not.toMatch(/MeddleWare/)
    expect(html).toContain('Token Issuance · Meddleware')
  })
})
