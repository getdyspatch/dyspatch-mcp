import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createMcpServer } from './server.js'

export type { ToolDefinition } from './server.js'
export { handleCallTool } from './server.js'

const transport = new StdioServerTransport()
await createMcpServer().connect(transport)
