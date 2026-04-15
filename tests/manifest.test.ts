import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'manifest.json'), 'utf8'),
) as Record<string, unknown>

describe('MCPB manifest.json', () => {
  it('declares manifest_version 0.3', () => {
    expect(manifest.manifest_version).toBe('0.3')
  })

  it('sets tools_generated: true so runtime tools are advertised', () => {
    expect(manifest.tools_generated).toBe(true)
  })

  it('configures a node server pointing at the esbuild output', () => {
    const server = manifest.server as Record<string, unknown>
    expect(server.type).toBe('node')
    expect(server.entry_point).toBe('mcpb-dist/server.js')

    const mcpConfig = server.mcp_config as { command: string; args: string[]; env: Record<string, string> }
    expect(mcpConfig.command).toBe('node')
    expect(mcpConfig.args).toContain('${__dirname}/mcpb-dist/server.js')
    expect(mcpConfig.env.DYSPATCH_API_KEY).toBe('${user_config.dyspatch_api_key}')
  })

  it('marks the Dyspatch API key as sensitive and required', () => {
    const userConfig = manifest.user_config as Record<string, Record<string, unknown>>
    const apiKey = userConfig.dyspatch_api_key
    expect(apiKey.type).toBe('string')
    expect(apiKey.sensitive).toBe(true)
    expect(apiKey.required).toBe(true)
  })

  it('pins a node runtime version', () => {
    const compatibility = manifest.compatibility as { runtimes: { node: string } }
    expect(compatibility.runtimes.node).toMatch(/^>=/)
  })

  it('keeps the manifest version in sync with package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'),
    ) as { version: string }
    expect(manifest.version).toBe(pkg.version)
  })
})
