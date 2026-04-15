import { z } from 'zod'
import type { DyspatchClient } from '../client.js'
import type { ToolDefinition } from '../index.js'

const listWorkspacesSchema = z.object({
  cursor: z.string().optional().describe('Pagination cursor from a previous response'),
})

const getFolderSchema = z.object({
  folderId: z.string().describe('Folder/workspace ID'),
})

export function workspaceTools(client: DyspatchClient): ToolDefinition[] {
  return [
    {
      name: 'list_workspaces',
      description: 'List all top-level workspace folders. Returns paginated results.',
      inputSchema: listWorkspacesSchema,
      annotations: {
        title: 'List Workspaces',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { cursor } = listWorkspacesSchema.parse(args)
        return client.get('/workspaces', { cursor })
      },
    },
    {
      name: 'get_folder',
      description: 'Get a workspace folder and its immediate subfolders by ID.',
      inputSchema: getFolderSchema,
      annotations: {
        title: 'Get Folder',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { folderId } = getFolderSchema.parse(args)
        return client.get(`/workspaces/${folderId}`)
      },
    },
  ]
}
