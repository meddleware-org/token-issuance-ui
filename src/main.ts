import '@meddleware/design-tokens/tokens.css'
import '@meddleware/design-tokens/seasons.css'
import '@meddleware/ui/reset.css'
import { createApp } from 'vue'
import { loadRuntimeConfig, useSeason } from '@meddleware/ui'
import './templateWasm.js'

// Enable seasonal theming (sets data-season on <html>; seasons.css is imported above). The colour mode is applied before the first paint
// by the theme-init script `index.html` loads.
useSeason()

// Machine-zone endpoints (the Walrus relays) may come from /runtime-config.json (ADR-0005); load it before any module that reads them.
void loadRuntimeConfig().then(async () => {
  // End-to-end builds only: a mock wallet and a stub chain whose publish succeeds (`src/e2e.ts`). Both conditions are static (and
  // vite.config.ts refuses VITE_E2E in any other mode), so every other build drops it; `npm run check:bundle` proves it.
  if (import.meta.env.MODE === 'e2e' && import.meta.env.VITE_E2E === '1') (await import('./e2e.js')).installE2e()
  const { default: App } = await import('./App.vue')
  createApp(App).mount('#app')
})
