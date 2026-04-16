import { z } from 'zod'
import type { DyspatchClient } from '../client.js'
import { typePath } from '../client.js'
import type { ToolDefinition } from '../index.js'
import {
  TargetLanguage,
  LANGUAGE_ID_DESCRIPTION,
  LOCALIZATION_NAME_DESCRIPTION,
  TARGET_LANGUAGE_DESCRIPTION,
  TEMPLATE_TYPE_DESCRIPTION,
  THEME_ID_DESCRIPTION,
  TRANSLATIONS_DESCRIPTION,
  TemplateType,
} from '../constants.js'

const typeAndDraft = z.object({
  type: TemplateType.describe(TEMPLATE_TYPE_DESCRIPTION),
  draftId: z.string().describe('Draft ID'),
})

const localizationRefSchema = typeAndDraft.extend({
  languageId: z.string().describe(LANGUAGE_ID_DESCRIPTION),
})

const getLocalizationSchema = z.object({
  type: TemplateType.describe(TEMPLATE_TYPE_DESCRIPTION),
  localizationId: z.string().describe('Localization ID'),
  targetLanguage: TargetLanguage.describe(TARGET_LANGUAGE_DESCRIPTION),
  themeId: z.string().optional().describe(THEME_ID_DESCRIPTION),
})

const upsertLocalizationSchema = localizationRefSchema.extend({
  name: z.string().describe(LOCALIZATION_NAME_DESCRIPTION),
})

const setTranslationsSchema = localizationRefSchema.extend({
  translations: z
    .record(z.string())
    .describe(TRANSLATIONS_DESCRIPTION),
})

export function localizationTools(client: DyspatchClient): ToolDefinition[] {
  return [
    {
      name: 'list_draft_localizations',
      description: 'List all localizations attached to a draft.',
      inputSchema: typeAndDraft,
      annotations: {
        title: 'List Draft Localizations',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
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
      annotations: {
        title: 'Get Localization',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, localizationId, targetLanguage, themeId } = getLocalizationSchema.parse(args)
        const prefix = typePath(type)
        return client.get(`${prefix}/localizations/${localizationId}`, { targetLanguage, themeId })
      },
    },
    {
      name: 'upsert_localization',
      description:
        'Create or update a localization on a draft for a given language.',
      inputSchema: upsertLocalizationSchema,
      annotations: {
        title: 'Upsert Localization',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
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
      annotations: {
        title: 'Delete Localization',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
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
      annotations: {
        title: 'Set Translations',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
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
