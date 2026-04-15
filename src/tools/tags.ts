import { z } from 'zod'
import type { DyspatchClient } from '../client.js'
import type { ToolDefinition } from '../index.js'

const TagType = z.enum(['template', 'draft', 'block'])

const listTagsSchema = z.object({
  type: TagType.optional().describe('Filter tags by resource type'),
  workspaceId: z.string().optional().describe('Filter tags by workspace ID'),
  cursor: z.string().optional().describe('Pagination cursor'),
})

const createTagSchema = z.object({
  name: z.string().describe('Tag name'),
  types: z
    .array(TagType)
    .describe('Resource types this tag applies to (template, draft, block)'),
  workspaceIds: z
    .array(z.string())
    .optional()
    .describe('Workspace IDs to scope this tag to (empty = all workspaces)'),
})

const assignTagSchema = z.object({
  tagId: z.string().describe('Tag ID to assign'),
  resourceId: z.string().describe('ID of the resource to assign the tag to'),
})

const tagIdSchema = z.object({
  tagId: z.string().describe('Tag ID'),
})

const updateTagSchema = tagIdSchema.extend({
  name: z.string().optional().describe('New tag name'),
  types: z
    .array(z.enum(['template', 'draft', 'block']))
    .optional()
    .describe('Resource types this tag applies to'),
  workspaceIds: z.array(z.string()).optional().describe('Workspace IDs to scope this tag to'),
  status: z.enum(['active', 'inactive']).optional().describe('Tag status'),
})

const unassignTagSchema = z.object({
  tagIds: z.array(z.string()).describe('Tag IDs to remove from the resource'),
  resourceId: z.string().describe('ID of the resource to remove tags from'),
})

export function tagTools(client: DyspatchClient): ToolDefinition[] {
  return [
    {
      name: 'list_tags',
      description: 'List all tags, optionally filtered by type or workspace.',
      inputSchema: listTagsSchema,
      annotations: {
        title: 'List Tags',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, workspaceId, cursor } = listTagsSchema.parse(args)
        return client.get('/tags', { type, workspaceId, cursor })
      },
    },
    {
      name: 'create_tag',
      description: 'Create a new tag that can be assigned to templates, drafts, or blocks.',
      inputSchema: createTagSchema,
      annotations: {
        title: 'Create Tag',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      async handler(args) {
        const { name, types, workspaceIds } = createTagSchema.parse(args)
        return client.post('/tags/create', { name, types, workspaceIds: workspaceIds ?? [] })
      },
    },
    {
      name: 'assign_tag',
      description: 'Assign a tag to a resource (template, draft, or block).',
      inputSchema: assignTagSchema,
      annotations: {
        title: 'Assign Tag',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { tagId, resourceId } = assignTagSchema.parse(args)
        return client.put(`/tags/assign/${resourceId}`, { tagIds: [tagId] })
      },
    },
    {
      name: 'get_tag',
      description: 'Get a single tag by ID.',
      inputSchema: tagIdSchema,
      annotations: {
        title: 'Get Tag',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { tagId } = tagIdSchema.parse(args)
        return client.get(`/tags/${tagId}`)
      },
    },
    {
      name: 'update_tag',
      description: 'Update an existing tag (name, types, workspace scope, or status).',
      inputSchema: updateTagSchema,
      annotations: {
        title: 'Update Tag',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { tagId, name, types, workspaceIds, status } = updateTagSchema.parse(args)
        return client.patch(`/tags/update/${tagId}`, { name, types, workspaceIds, status })
      },
    },
    {
      name: 'delete_tag',
      description: 'Permanently delete a tag.',
      inputSchema: tagIdSchema,
      annotations: {
        title: 'Delete Tag',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { tagId } = tagIdSchema.parse(args)
        return client.delete(`/tags/delete/${tagId}`)
      },
    },
    {
      name: 'unassign_tag',
      description: 'Remove one or more tags from a resource (template, draft, or block).',
      inputSchema: unassignTagSchema,
      annotations: {
        title: 'Unassign Tag',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { tagIds, resourceId } = unassignTagSchema.parse(args)
        return Promise.all(
          tagIds.map(tagId => client.post(`/tags/unassign/${resourceId}`, { tagId })),
        )
      },
    },
  ]
}
