// Vitest configuration for the tests in tests/: the fleet's shared Vue test preset (jsdom, the shared setup) plus the Vue plugin.
// defineConfig, the Vue plugin and the shared preset.
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { vueTestConfig } from '@meddleware/frontend-config/vitest'

// Unit + component tests: the Vue plugin compiles SFCs for @vue/test-utils mounts and jsdom provides the DOM they render into.
// The preset, with the Vue plugin the components need.
export default defineConfig(vueTestConfig({ plugins: [vue()] }))
