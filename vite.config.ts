// Vite configuration for the Token Issuance app: the fleet's shared application preset (@meddleware/frontend-config/vite) plus what is particular to this app: a production
// build refuses an unset fee treasury, the canonical URL placeholder, the Move wasm, and a long-lived Sui vendor chunk.
// Vite, the Vue plugin and the shared preset (with its guard that keeps the end-to-end harness out of every other mode).
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { assertE2eOnlyInE2eMode, meddlewareApp } from '@meddleware/frontend-config/vite'

// The zero address: a treasury still set to it would burn revenue.
const ZERO_ADDR = '0x' + '0'.repeat(64)

// Networks a production build must have a real (non-zero) treasury for. Mainnet is not listed: without
// VITE_FEE_TREASURY_MAINNET the app keeps mainnet closed (isNetworkOpen in src/config.ts), so it never deploys without a fee.
const REQUIRED_TREASURY_NETWORKS = ['TESTNET'] as const

/**
 * Fail a production build when a selectable network's fee treasury is still the
 * zero address, so revenue can never silently burn to 0x0. The only bypass is
 * VITE_ALLOW_UNSET_TREASURY=1 (dev/CI builds); the e2e mode never reaches this check.
 */
function assertTreasuryConfigured(env: Record<string, string>): void {
  if (env.VITE_ALLOW_UNSET_TREASURY === '1') return
  const unset = REQUIRED_TREASURY_NETWORKS.filter((n) => {
    const v = env[`VITE_FEE_TREASURY_${n}`]
    return !v || v === ZERO_ADDR
  })
  if (unset.length > 0) {
    throw new Error(
      `Refusing to build: fee treasury unset (zero address) for ${unset.join(', ')}. ` +
        `Set VITE_FEE_TREASURY_${unset[0]} (see .env.production/.env.example), ` +
        `or set VITE_ALLOW_UNSET_TREASURY=1 for a dev/e2e build.`,
    )
  }
}

// The move-bytecode-template package ships a .wasm that must be served as an
// asset; `wasm` is excluded from dep-optimization so its URL import resolves.
/** Public origin used for the canonical URL + Open Graph tags (`%VITE_PUBLIC_URL%` in index.html). */
const DEFAULT_PUBLIC_URL = 'https://sui-token-issuance.meddleware.co.uk'

// The config is a function of the command and mode, because the checks and the placeholder depend on them.
export default defineConfig((configEnv) => {
  // The command (serve or build) and the mode (development, production or e2e).
  const { command, mode } = configEnv
  // Every VITE_* setting, including those from .env files.
  const env = loadEnv(mode, process.cwd(), '')
  // The end-to-end build (`--mode e2e`) includes a mock wallet; nothing else may (not even through a .env file).
  assertE2eOnlyInE2eMode(mode, env)
  // A production build must have a real fee treasury (the helper above).
  if (command === 'build' && mode === 'production') assertTreasuryConfigured(env)
  // Every mode (dev, e2e, production) resolves the placeholder; a white-label deployment overrides it
  // with VITE_PUBLIC_URL (Docker build arg / CI var / .env file).
  // Every mode resolves the placeholder: the default, or the deployment's own address without a trailing slash.
  process.env.VITE_PUBLIC_URL = (env.VITE_PUBLIC_URL || DEFAULT_PUBLIC_URL).replace(/\/+$/, '')

  // meddlewareApp supplies the browser target, theme-init and keeps @meddleware/wallet-adapter out of
  // dep pre-bundling (it ships TS + .vue source and holds the shared wallet singleton).
  // The shared preset, with this app's theme, name, base path, wasm exclusion and chunking.
  return meddlewareApp({
    plugins: [vue()],
    theme: 'system',
    name: 'Token Issuance',
    config: {
      // The app is served from the root of its host.
      base: '/',
      // The bytecode template ships a .wasm that must be served as an asset, so it is excluded from dependency pre-bundling.
      optimizeDeps: { exclude: ['@mysten/move-bytecode-template'] },
      build: {
        rollupOptions: {
          output: {
            // Pin the Sui SDK into its own long-lived vendor chunk so app changes
            // don't bust its cache. Matched by module id (not package entry, which
            // @mysten/sui does not expose). @mysten/walrus + move-bytecode-template
            // are explicitly left out so they stay in their lazy dynamic chunks.
            // Chunking: the Sui SDK in one vendor chunk, so app changes do not bust its cache.
            manualChunks(id: string) {
              if (id.includes('@mysten/walrus') || id.includes('move-bytecode-template')) return
              if (
                id.includes('@mysten/sui') ||
                id.includes('@mysten/bcs') ||
                id.includes('@mysten/wallet-standard')
              ) {
                return 'vendor-sui'
              }
            },
          },
        },
      },
    },
  })(configEnv)
})
