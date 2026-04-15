#!/usr/bin/env node
import { build } from 'esbuild'
import { rm, mkdir } from 'node:fs/promises'

const outdir = 'mcpb-dist'

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
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
})
