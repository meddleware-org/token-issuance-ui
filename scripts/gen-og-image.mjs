// Regenerates public/og-image.png (1200x630 social card) via headless Chrome, in the design tokens' dark palette and system font stack,
// with the company mark beside the headline. Colours are read from @meddleware/design-tokens (semantic.dark), so a palette change
// follows by re-running this. Run from the app dir: `npm run gen:og-image`. CHROME_PATH overrides the browser.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../public/og-image.png', import.meta.url))
const require = createRequire(import.meta.url)
const { semantic, brand } = JSON.parse(readFileSync(require.resolve('@meddleware/design-tokens/tokens.json'), 'utf8'))
const c = semantic.dark
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' // --mw-font-sans

// The company mark (the Kopimi "K"): MARK_VIEW_BOX and MARK_PATH from @meddleware/ui/src/brand/mark.ts, filled with the accent colour.
const MARK_VIEW_BOX = '-88 1 790 790'
const MARK_PATH =
  'm441.08 720.52l-93.24 66.61-417.03-295.1 0.004-251.03 93.239-65.58 149.6 104.51v-210.05l93.24-66.6 94.27 66.604v210.05l67.62-47.13 79.93 56.36 80.94-57.39 94.26 66.61v251.03l-94.26 65.58-80.94-57.38-67.63 48.15z M-43.573 241l67.626 48.16 68.65-48.16-68.65-48.16zm80.948 57.38l67.625 48.15 68.65-48.15-67.62-48.17zm79.925 57.37l68.64 48.16 68.66-48.16-68.66-48.15zm149.59-334.03l-68.65 48.16 68.65 48.156 68.65-48.156zm0 114.76l-68.65 48.16 68.65 48.16 67.63-49.18zm0 113.74l-68.65 48.16 68.65 48.15 67.63-48.15zm-68.65 162.91l68.65 47.14 67.63-48.16-67.63-47.14zm80.95 56.35l68.65 48.16 67.62-48.16-67.62-48.15zm149.59-219.26l-68.65 48.16 67.63 48.15 68.65-48.15zm160.87 0l-67.63 48.16 67.63 48.15 68.65-48.15z'

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box;font-family:${FONT}}
body{width:1200px;height:630px;background:${c.bg};color:${c.text};display:flex;flex-direction:column;justify-content:center;padding:80px;position:relative;border-top:10px solid ${brand.oxblood['400']}}
.badge{display:inline-block;font-size:26px;letter-spacing:.12em;text-transform:uppercase;color:${c.accent};border:2px solid ${c.border};border-radius:999px;padding:10px 26px;width:max-content;margin-bottom:36px}
.head{display:flex;align-items:center;gap:36px;margin-bottom:28px}
.mark{flex:none;width:128px;height:128px;fill:${c.accent}}
h1{font-size:62px;line-height:1.1;font-weight:800;letter-spacing:-.02em}
h1 .accent{color:${c.accent}}
p{font-size:32px;line-height:1.38;color:${c.muted};max-width:980px}
.row{display:flex;gap:18px;margin-top:48px}
.chip{font-size:24px;color:${c.text};background:${c.lift};border:1px solid ${c.border};border-radius:10px;padding:12px 20px}
.url{position:absolute;top:102px;right:80px;font-size:24px;color:${c.muted};font-weight:600}
</style></head><body>
<div class="badge">Sui &middot; client-side</div>
<div class="head">
<svg class="mark" viewBox="${MARK_VIEW_BOX}" aria-hidden="true"><path d="${MARK_PATH}"/></svg>
<h1>Create your own <span class="accent">Sui coin</span><br>in the browser</h1>
</div>
<p>Your wallet signs and pays gas &mdash; nothing is compiled or signed on a server. Keep the full, verifiable source package.</p>
<div class="row"><div class="chip">No server</div><div class="chip">No custody</div><div class="chip">Full source included</div></div>
<div class="url">sui-token-issuance.meddleware.co.uk</div>
</body></html>`

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
writeFileSync(OUT, await page.screenshot({ type: 'png' }))
await browser.close()
console.log('wrote', OUT)
