import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { vueTestConfig } from '@meddleware/frontend-config/vitest'

// Unit + component tests: the Vue plugin compiles SFCs for @vue/test-utils mounts and jsdom provides the DOM they render into.
export default defineConfig(vueTestConfig({ plugins: [vue()] }))
