#!/usr/bin/env node
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createMcpServer } from './server.js'

export type { ToolDefinition } from './server.js'
export { handleCallTool } from './server.js'

// Only start when executed directly, not when imported in tests
// realpathSync resolves npx symlinks so the check works with bin entries
const isMain = realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const transport = new StdioServerTransport()
  await createMcpServer().connect(transport)
}
