import { z } from 'zod'
import type { DyspatchClient } from '../client.js'
import type { ToolDefinition } from '../index.js'
import {
  CURSOR_DESCRIPTION,
  LANGUAGE_ID_DESCRIPTION,
  LOCALIZATION_NAME_DESCRIPTION,
  TRANSLATIONS_DESCRIPTION,
} from '../constants.js'

const listBlocksSchema = z.object({
  cursor: z.string().optional().describe(CURSOR_DESCRIPTION),
})

const getBlockSchema = z.object({
  blockId: z.string().describe('Block ID (e.g. blo_xxxx)'),
})

const blockLocalizationRefSchema = z.object({
  blockId: z.string().describe('Block ID (e.g. blo_xxxx)'),
  languageId: z.string().describe(LANGUAGE_ID_DESCRIPTION),
})

export function blockTools(client: DyspatchClient): ToolDefinition[] {
  return [
    {
      name: 'list_blocks',
      description: 'List all reusable content blocks. Returns paginated results.',
      inputSchema: listBlocksSchema,
      annotations: {
        title: 'List Blocks',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { cursor } = listBlocksSchema.parse(args)
        return client.get('/blocks', { cursor })
      },
    },
    {
      name: 'get_block',
      description: 'Get a single reusable content block by ID.',
      inputSchema: getBlockSchema,
      annotations: {
        title: 'Get Block',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { blockId } = getBlockSchema.parse(args)
        return client.get(`/blocks/${blockId}`)
      },
    },
    {
      name: 'list_block_localizations',
      description: 'List all localizations attached to a reusable content block.',
      inputSchema: getBlockSchema,
      annotations: {
        title: 'List Block Localizations',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { blockId } = getBlockSchema.parse(args)
        return client.get(`/blocks/${blockId}/localizations`)
      },
    },
    {
      name: 'get_block_localization_keys',
      description:
        'Get all translatable string keys defined in a block. Use this to discover what keys are available before calling set_block_translations.',
      inputSchema: getBlockSchema,
      annotations: {
        title: 'Get Block Localization Keys',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { blockId } = getBlockSchema.parse(args)
        return client.get(`/blocks/${blockId}/localizationKeys`)
      },
    },
    {
      name: 'upsert_block_localization',
      description: 'Create or update a localization on a block for a given language.',
      inputSchema: blockLocalizationRefSchema.extend({
        name: z.string().describe(LOCALIZATION_NAME_DESCRIPTION),
      }),
      annotations: {
        title: 'Upsert Block Localization',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const schema = blockLocalizationRefSchema.extend({
          name: z.string().describe(LOCALIZATION_NAME_DESCRIPTION),
        })
        const { blockId, languageId, name } = schema.parse(args)
        return client.put(`/blocks/${blockId}/localizations/${languageId}`, { name })
      },
    },
    {
      name: 'delete_block_localization',
      description: 'Delete a localization from a block.',
      inputSchema: blockLocalizationRefSchema,
      annotations: {
        title: 'Delete Block Localization',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { blockId, languageId } = blockLocalizationRefSchema.parse(args)
        return client.delete(`/blocks/${blockId}/localizations/${languageId}`)
      },
    },
    {
      name: 'set_block_translations',
      description:
        'Replace all translations for a localization on a block. The translations object is a flat key/value map of string keys to translated strings.',
      inputSchema: blockLocalizationRefSchema.extend({
        translations: z
          .record(z.string())
          .describe(TRANSLATIONS_DESCRIPTION),
      }),
      annotations: {
        title: 'Set Block Translations',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const schema = blockLocalizationRefSchema.extend({
          translations: z.record(z.string()).describe(TRANSLATIONS_DESCRIPTION),
        })
        const { blockId, languageId, translations } = schema.parse(args)
        return client.put(`/blocks/${blockId}/localizations/${languageId}/translations`, translations)
      },
    },
  ]
}
