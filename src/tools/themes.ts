import { z } from 'zod'
import type { DyspatchClient } from '../client.js'
import type { ToolDefinition } from '../index.js'
import { CURSOR_DESCRIPTION } from '../constants.js'

const listThemesSchema = z.object({
  cursor: z.string().optional().describe(CURSOR_DESCRIPTION),
})

const getThemeSchema = z.object({
  themeId: z.string().describe('Theme ID (e.g. thm_xxxx)'),
})

export function themeTools(client: DyspatchClient): ToolDefinition[] {
  return [
    {
      name: 'list_themes',
      description: 'List all themes for the organization. Returns paginated results.',
      inputSchema: listThemesSchema,
      annotations: {
        title: 'List Themes',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { cursor } = listThemesSchema.parse(args)
        return client.get('/themes', { cursor })
      },
    },
    {
      name: 'get_theme',
      description: 'Get a theme by ID, including its name, description, and Figma URL.',
      inputSchema: getThemeSchema,
      annotations: {
        title: 'Get Theme',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { themeId } = getThemeSchema.parse(args)
        return client.get(`/themes/${themeId}`)
      },
    },
  ]
}
