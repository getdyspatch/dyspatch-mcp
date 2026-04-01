#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createMcpServer } from './server.js'

export type { ToolDefinition } from './server.js'
export { handleCallTool } from './server.js'

// Only start when executed directly, not when imported in tests
const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const transport = new StdioServerTransport()
  await createMcpServer().connect(transport)
}
