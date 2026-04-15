#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'))
const output = `dyspatch-mcp-${manifest.version}.mcpb`

const result = spawnSync('npx', ['@anthropic-ai/mcpb', 'pack', '.', output], {
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
