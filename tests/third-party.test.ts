// De-enshittification: the sources and the production build call no third-party origin (no web fonts, CDN, analytics, external images,
// no licence text from GitHub). The only network traffic is the chain (Sui RPC, the Walrus relay, aggregator and publisher) plus
// api.github.com for the user's own explicit "push to GitHub". The build part runs over `dist/` once it exists; CI sets REQUIRE_DIST=1
// after `npm run build` so a missing build fails instead of skipping.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const dist = join(root, 'dist')

const FORBIDDEN = /fonts\.googleapis|fonts\.gstatic|@fontsource|unpkg\.com|jsdelivr|cdnjs|cdn\.|gravatar|google-analytics|googletagmanager|gtag\(|plausible|matomo|hotjar|segment\.(com|io)|raw\.githubusercontent/i

/** Hosts the app may call: protocol endpoints only. Nothing is requested from any other origin. */
const REQUEST_HOSTS = [
  /^fullnode\.(mainnet|testnet|devnet)\.sui\.io$/, // Sui RPC (gRPC-web)
  /^upload-relay\.(mainnet|testnet)\.walrus\.space$/, // Walrus upload relay
  /^aggregator\.walrus-(mainnet|testnet)\.walrus\.space$/, // Walrus aggregator
  /^publisher\.walrus-(mainnet|testnet)\.walrus\.space$/, // Walrus publisher
  /^api\.github\.com$/, // only when the user explicitly pushes the source package to their own GitHub
  /^(127\.0\.0\.1|localhost)$/, // a local test chain
]
/** Hosts that appear only as text or links (never requested): XML namespaces, the app's own origins, docs and explorer links, strings
 *  inside the bundled libraries' messages and the generated package's README. */
const NAMED_ONLY_HOSTS = [
  /^www\.w3\.org$/,
  /^(sui-token-issuance\.|docs\.)?meddleware\.(co\.uk|dev)$/,
  /^github\.com$/,
  /^spdx\.org$/, // the "View on SPDX" link beside a licence (opened by the reader; the text itself is vendored)
  /^(testnet\.|devnet\.)?suivision\.xyz$/,
  /^(mainnet\.|testnet\.)mvr\.mystenlabs\.com$/, // the Sui SDK's default name-resolution endpoints (named, not used: no package names are resolved)
  /^vuejs\.org$/,
  /^site\.invalid$/,
]
const hostsIn = (text: string): string[] => [...text.matchAll(/https?:\/\/([A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9])/g)].map((m) => m[1]!.toLowerCase())
const allowed = (host: string): boolean => [...REQUEST_HOSTS, ...NAMED_ONLY_HOSTS].some((re) => re.test(host))

function filesOf(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesOf(join(dir, e.name)) : [join(dir, e.name)]))
}
const rel = (f: string) => f.slice(root.length + 1)

describe('sources', () => {
  const files = [...filesOf(join(root, 'src')).filter((f) => !f.includes('/e2e') && !f.endsWith('license-texts.json')), join(root, 'index.html'), ...filesOf(join(root, 'public'))]
  it.each(files.map((f) => [rel(f), f]))('%s names no third-party font, CDN, tracker or GitHub-hosted licence text', (_name, file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(FORBIDDEN)
  })

  it('keeps no icon of its own: the shared brand icon plugin provides the set', () => {
    expect(existsSync(join(root, 'public', 'favicon.svg'))).toBe(false)
    expect(existsSync(join(root, 'public', 'favicon.ico'))).toBe(false)
    expect(readFileSync(join(root, 'index.html'), 'utf8')).not.toMatch(/rel="(shortcut )?icon"|apple-touch-icon/)
  })

  it('calls GitHub only for the explicit push, nowhere else', () => {
    const users = filesOf(join(root, 'src'))
      .filter((f) => !f.includes('/e2e') && /\.(ts|vue)$/.test(f))
      .filter((f) => /github\.com/.test(readFileSync(f, 'utf8')))
      .map(rel)
      .sort()
    expect(users).toEqual(['src/components/GithubPush.vue', 'src/lib/github.ts'])
  })
})

describe.skipIf(!existsSync(dist) && !process.env.REQUIRE_DIST)('production build', () => {
  it('exists', () => expect(existsSync(dist)).toBe(true))

  it('ships no web font files', () => {
    expect(filesOf(dist).filter((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f))).toEqual([])
  })

  it('has the brand icon set and the manifest', () => {
    for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']) {
      expect(existsSync(join(dist, f)), f).toBe(true)
    }
    expect(JSON.parse(readFileSync(join(dist, 'site.webmanifest'), 'utf8')).name).toBe('Token Issuance')
  })

  it('links exactly one svg icon from the page', () => {
    const html = readFileSync(join(dist, 'index.html'), 'utf8')
    expect(html.match(/<link[^>]*rel="icon"[^>]*type="image\/svg\+xml"/g) ?? []).toHaveLength(1)
  })

  it('vendors the licence texts as its own chunk, so no licence is fetched', () => {
    expect(filesOf(join(dist, 'assets')).filter((f) => /license-texts-.*\.js$/.test(f))).toHaveLength(1)
  })

  it('names no origin other than the chain, the explicit GitHub push, and plain links', () => {
    // The licence-texts chunk is data: the licences' own text mentions their publishers' addresses; it is never requested.
    const text = filesOf(dist)
      .filter((f) => /\.(html|css|js|webmanifest)$/.test(f) && !/license-texts-/.test(f))
      .map((f) => [rel(f), readFileSync(f, 'utf8')] as const)
    for (const [name, body] of text) {
      expect(body, name).not.toMatch(FORBIDDEN)
      expect(hostsIn(body).filter((h) => !allowed(h)), name).toEqual([])
      // Markup and styles load nothing from another origin (the canonical link and the docs links point at Meddleware's own sites).
      if (/\.(html|css)$/.test(name)) expect(body, name).not.toMatch(/(src|href)="https?:\/\/(?![a-z-]+\.meddleware\.(co\.uk|dev)|meddleware\.(co\.uk|dev))|url\(\s*["']?https?:/)
    }
  })

  it('requests nothing for a licence: no GitHub raw host anywhere in the build, the texts included', () => {
    for (const f of filesOf(dist).filter((f) => /\.(html|css|js)$/.test(f))) expect(readFileSync(f, 'utf8'), rel(f)).not.toMatch(/raw\.githubusercontent/)
  })
})
