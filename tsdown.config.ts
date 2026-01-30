import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  dts: true,
  external: [
    ...Object.keys(pkg.peerDependencies || {}),
    // /^vue/,
    // ...Object.keys(pkg.dependencies || {}),
    // /^@vue\/devtools-api/,
  ],
})
