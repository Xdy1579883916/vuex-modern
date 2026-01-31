import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __DEV__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
  test: {
    environment: 'happy-dom',
    alias: {
      '@': path.resolve(__dirname, './src'),
      'test': path.resolve(__dirname, './tests'),
    },
  },
})
