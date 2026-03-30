import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { createClient } from './client.js'
import { templateTools } from './tools/templates.js'
import { draftTools } from './tools/drafts.js'
import { localizationTools } from './tools/localizations.js'
import { blockTools } from './tools/blocks.js'
import { workspaceTools } from './tools/workspaces.js'
import { tagTools } from './tools/tags.js'

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: z.ZodType
  handler(args: unknown): Promise<unknown>
}

const client = createClient()

const allTools: ToolDefinition[] = [
  ...templateTools(client),
  ...draftTools(client),
  ...localizationTools(client),
  ...blockTools(client),
  ...workspaceTools(client),
  ...tagTools(client),
]

const toolMap = new Map<string, ToolDefinition>(allTools.map((t) => [t.name, t]))

const server = new Server(
  { name: 'dyspatch', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.inputSchema),
  })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolMap.get(request.params.name)
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    }
  }

  try {
    const result = await tool.handler(request.params.arguments ?? {})
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
