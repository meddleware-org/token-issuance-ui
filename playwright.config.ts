import { definePlaywrightConfig } from '@meddleware/frontend-config/playwright'

// Browser tests of the BUILT app (`vite preview` of dist): Chromium locally, all five browser projects in CI (E2E_BROWSERS=all to run
// them locally). Every request that leaves localhost is refused in the specs, so runs need no network. The screenshot capture
// (`npm run shots`) is for looking, not asserting.
// The e2e build (`--mode e2e`) registers a mock wallet and a stub chain whose publish succeeds, so the whole wizard runs offline.
// Real-chain e2e stays in scripts/e2e-deploy.mjs (npm run e2e:localnet…).
export default definePlaywrightConfig({ port: 4292, command: 'npm run build:e2e && npx vite preview --port 4292 --strictPort' })
