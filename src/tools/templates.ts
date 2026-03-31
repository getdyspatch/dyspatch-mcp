import { z } from 'zod'
import type { DyspatchClient } from '../client.js'
import { typePath } from '../client.js'
import type { ToolDefinition } from '../index.js'

const TemplateType = z.enum(['email', 'sms', 'push', 'voice', 'liveactivity'])

const listTemplatesSchema = z.object({
  type: TemplateType.describe('Template channel type'),
  cursor: z.string().optional().describe('Pagination cursor from a previous response'),
})

const getTemplateSchema = z.object({
  type: TemplateType.describe('Template channel type'),
  templateId: z.string().describe('Template ID (e.g. tem_xxxx)'),
  targetLanguage: z
    .string()
    .optional()
    .describe('Target language for compiled output (e.g. html, handlebars, liquid). Required for visual templates — omit only for code-based templates.'),
  themeId: z.string().optional().describe('Theme ID to use when compiling the template'),
})

const renderTemplateSchema = z.object({
  type: TemplateType.describe('Template channel type'),
  templateId: z.string().describe('Template ID'),
  languageId: z.string().optional().describe('Language ID for localized render (e.g. en-US)'),
  variables: z
    .record(z.unknown())
    .optional()
    .describe('Key/value object of template variables'),
  themeId: z.string().optional().describe('Theme ID to use when rendering'),
})

export function templateTools(client: DyspatchClient): ToolDefinition[] {
  return [
    {
      name: 'list_templates',
      description:
        'List published templates of a given channel type (email, sms, push, voice, or liveactivity). Returns paginated results.',
      inputSchema: listTemplatesSchema,
      async handler(args) {
        const { type, cursor } = listTemplatesSchema.parse(args)
        const prefix = typePath(type)
        return client.get(`${prefix}/templates`, { cursor })
      },
    },
    {
      name: 'get_template',
      description:
        'Get a single template including its compiled revision (subject, HTML, text, variables, etc.).',
      inputSchema: getTemplateSchema,
      async handler(args) {
        const { type, templateId, targetLanguage, themeId } = getTemplateSchema.parse(args)
        const prefix = typePath(type)
        return client.get(`${prefix}/templates/${templateId}`, { targetLanguage, themeId })
      },
    },
    {
      name: 'render_template',
      description:
        'Render a published template with provided variables. Returns compiled HTML/text output. Optionally render for a specific language or theme.',
      inputSchema: renderTemplateSchema,
      async handler(args) {
        const { type, templateId, languageId, variables, themeId } = renderTemplateSchema.parse(args)
        const prefix = typePath(type)
        const path = languageId
          ? `${prefix}/render/template/${templateId}/${languageId}`
          : `${prefix}/render/template/${templateId}`
        const query: Record<string, string | undefined> = { themeId }
        const qs = themeId ? `?themeId=${encodeURIComponent(themeId)}` : ''
        void query
        return client.post(`${path}${qs}`, variables ?? {})
      },
    },
  ]
}
