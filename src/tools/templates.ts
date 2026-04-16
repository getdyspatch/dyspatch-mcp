import { z } from 'zod'
import type { DyspatchClient } from '../client.js'
import { typePath } from '../client.js'
import type { ToolDefinition } from '../index.js'
import {
  TargetLanguage,
  CURSOR_DESCRIPTION,
  LANGUAGE_ID_DESCRIPTION,
  TARGET_LANGUAGE_DESCRIPTION,
  TEMPLATE_TYPE_DESCRIPTION,
  THEME_ID_DESCRIPTION,
  TemplateType,
} from '../constants.js'


const listTemplatesSchema = z.object({
  type: TemplateType.describe(TEMPLATE_TYPE_DESCRIPTION),
  cursor: z.string().optional().describe(CURSOR_DESCRIPTION),
})

const getTemplateSchema = z.object({
  type: TemplateType.describe(TEMPLATE_TYPE_DESCRIPTION),
  templateId: z.string().describe('Template ID (e.g. tem_xxxx)'),
  targetLanguage: TargetLanguage.describe(TARGET_LANGUAGE_DESCRIPTION),
  themeId: z.string().optional().describe(THEME_ID_DESCRIPTION),
})

const renderTemplateSchema = z.object({
  type: TemplateType.describe(TEMPLATE_TYPE_DESCRIPTION),
  templateId: z.string().describe('Template ID'),
  languageId: z.string().optional().describe(LANGUAGE_ID_DESCRIPTION),
  variables: z
    .record(z.unknown())
    .optional()
    .describe(
      'JSON object of template variables. Values can be strings, numbers, booleans, nested objects, or arrays — preserve the original structure, do not flatten.',
    ),
  themeId: z.string().optional().describe(THEME_ID_DESCRIPTION),
})

export function templateTools(client: DyspatchClient): ToolDefinition[] {
  return [
    {
      name: 'list_templates',
      description:
        'List published templates of a given channel type (email, sms, push, voice, or liveactivity). Returns paginated results.',
      inputSchema: listTemplatesSchema,
      annotations: {
        title: 'List Templates',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
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
      annotations: {
        title: 'Get Template',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
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
      annotations: {
        title: 'Render Template',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
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
