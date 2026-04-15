#!/usr/bin/env node
import { build } from 'esbuild'
import { rm, mkdir, readFile } from 'node:fs/promises'

const outdir = 'mcpb-dist'
const { version } = JSON.parse(await readFile('package.json', 'utf8'))

await rm(outdir, { recursive: true, force: true })
await mkdir(outdir, { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  outfile: `${outdir}/server.js`,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  minify: true,
  sourcemap: false,
  define: {
    __PKG_VERSION__: JSON.stringify(version),
  },
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
})
