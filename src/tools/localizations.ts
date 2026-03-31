import { z } from 'zod'
import type { DyspatchClient } from '../client.js'
import { typePath } from '../client.js'
import type { ToolDefinition } from '../index.js'

const TemplateType = z.enum(['email', 'sms', 'push', 'voice', 'liveactivity'])

const typeAndDraft = z.object({
  type: TemplateType.describe('Template channel type'),
  draftId: z.string().describe('Draft ID'),
})

const localizationRefSchema = typeAndDraft.extend({
  languageId: z.string().describe('Language ID (e.g. en-US, fr-FR)'),
})

const getLocalizationSchema = z.object({
  type: TemplateType.describe('Template channel type'),
  localizationId: z.string().describe('Localization ID'),
  targetLanguage: z.string().optional().describe('Target language for compiled output (e.g. html, handlebars, liquid). Required for visual templates — omit only for code-based templates.'),
  themeId: z.string().optional().describe('Theme ID to use when compiling'),
})

const upsertLocalizationSchema = localizationRefSchema.extend({
  name: z.string().describe('Display name for the localization'),
})

const setTranslationsSchema = localizationRefSchema.extend({
  translations: z
    .record(z.string())
    .describe('Key/value map of translation strings to set (replaces all existing translations)'),
})

export function localizationTools(client: DyspatchClient): ToolDefinition[] {
  return [
    {
      name: 'list_draft_localizations',
      description: 'List all localizations attached to a draft.',
      inputSchema: typeAndDraft,
      async handler(args) {
        const { type, draftId } = typeAndDraft.parse(args)
        const prefix = typePath(type)
        return client.get(`${prefix}/drafts/${draftId}/localizations`)
      },
    },
    {
      name: 'get_localization',
      description: 'Get a published localization including its compiled revision.',
      inputSchema: getLocalizationSchema,
      async handler(args) {
        const { type, localizationId, targetLanguage, themeId } = getLocalizationSchema.parse(args)
        const prefix = typePath(type)
        return client.get(`${prefix}/localizations/${localizationId}`, { targetLanguage, themeId })
      },
    },
    {
      name: 'upsert_localization',
      description:
        'Create or update a localization on a draft for a given language. Use a BCP-47 language tag as languageId (e.g. en-US).',
      inputSchema: upsertLocalizationSchema,
      async handler(args) {
        const { type, draftId, languageId, name } = upsertLocalizationSchema.parse(args)
        const prefix = typePath(type)
        return client.put(`${prefix}/drafts/${draftId}/localizations/${languageId}`, { name })
      },
    },
    {
      name: 'delete_localization',
      description: 'Delete a localization from a draft.',
      inputSchema: localizationRefSchema,
      async handler(args) {
        const { type, draftId, languageId } = localizationRefSchema.parse(args)
        const prefix = typePath(type)
        return client.delete(`${prefix}/drafts/${draftId}/localizations/${languageId}`)
      },
    },
    {
      name: 'set_translations',
      description:
        'Replace all translations for a localization on a draft. The translations object is a flat key/value map of string keys to translated strings.',
      inputSchema: setTranslationsSchema,
      async handler(args) {
        const { type, draftId, languageId, translations } = setTranslationsSchema.parse(args)
        const prefix = typePath(type)
        return client.put(
          `${prefix}/drafts/${draftId}/localizations/${languageId}/translations`,
          translations,
        )
      },
    },
  ]
}
