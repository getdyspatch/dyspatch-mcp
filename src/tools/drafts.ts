import { z } from 'zod'
import type { DyspatchClient } from '../client.js'
import { typePath } from '../client.js'
import type { ToolDefinition } from '../index.js'

const TemplateType = z.enum(['email', 'sms', 'push', 'voice', 'liveactivity'])

const typeAndDraft = z.object({
  type: TemplateType.describe('Template channel type'),
  draftId: z.string().describe('Draft ID (e.g. tdft_xxxx)'),
})

const typeAndDraftWithFeedback = typeAndDraft.extend({
  feedback: z.string().optional().describe('Optional plain-text feedback for the approval or rejection'),
})

const listDraftsSchema = z.object({
  type: TemplateType.describe('Template channel type'),
  cursor: z.string().optional().describe('Pagination cursor'),
  status: z
    .enum(['IN_PROGRESS', 'PENDING_APPROVAL', 'LOCKED_FOR_TRANSLATION'])
    .optional()
    .describe('Filter by draft status'),
})

const getDraftSchema = typeAndDraft.extend({
  targetLanguage: z
    .string()
    .optional()
    .describe('Target language for compiled output (e.g. html, handlebars, liquid). Required for visual templates — omit only for code-based templates.'),
  themeId: z.string().optional().describe('Theme ID to use when compiling the draft'),
})

const duplicateDraftSchema = typeAndDraft.extend({
  name: z.string().describe('Name for the new duplicate draft'),
})

export function draftTools(client: DyspatchClient): ToolDefinition[] {
  return [
    {
      name: 'list_drafts',
      description: 'List all drafts for a given channel type. Returns paginated results.',
      inputSchema: listDraftsSchema,
      annotations: {
        title: 'List Drafts',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, cursor, status } = listDraftsSchema.parse(args)
        const prefix = typePath(type)
        return client.get(`${prefix}/drafts`, { cursor, status })
      },
    },
    {
      name: 'get_draft',
      description:
        'Get a single draft including its compiled revision content. Optionally specify a target language or theme.',
      inputSchema: getDraftSchema,
      annotations: {
        title: 'Get Draft',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, draftId, targetLanguage, themeId } = getDraftSchema.parse(args)
        const prefix = typePath(type)
        return client.get(`${prefix}/drafts/${draftId}`, { targetLanguage, themeId })
      },
    },
    {
      name: 'submit_draft',
      description: 'Submit a draft for approval (publish request).',
      inputSchema: typeAndDraft,
      annotations: {
        title: 'Submit Draft for Approval',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, draftId } = typeAndDraft.parse(args)
        const prefix = typePath(type)
        return client.post(`${prefix}/drafts/${draftId}/publishRequest`)
      },
    },
    {
      name: 'approve_draft',
      description: 'Approve a draft for publishing. Optionally include a feedback message.',
      inputSchema: typeAndDraftWithFeedback,
      annotations: {
        title: 'Approve Draft',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, draftId, feedback } = typeAndDraftWithFeedback.parse(args)
        const prefix = typePath(type)
        return client.postText(`${prefix}/drafts/${draftId}/publish/approve`, feedback)
      },
    },
    {
      name: 'approve_all_localizations',
      description: 'Approve all localizations of a draft for publishing.',
      inputSchema: typeAndDraft,
      annotations: {
        title: 'Approve All Localizations',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, draftId } = typeAndDraft.parse(args)
        const prefix = typePath(type)
        return client.post(`${prefix}/drafts/${draftId}/publish/approveAll`)
      },
    },
    {
      name: 'reject_draft',
      description: 'Reject a draft that was submitted for approval. Optionally include a feedback message.',
      inputSchema: typeAndDraftWithFeedback,
      annotations: {
        title: 'Reject Draft',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, draftId, feedback } = typeAndDraftWithFeedback.parse(args)
        const prefix = typePath(type)
        return client.postText(`${prefix}/drafts/${draftId}/publish/reject`, feedback)
      },
    },
    {
      name: 'duplicate_draft',
      description: 'Create a copy of an existing draft.',
      inputSchema: duplicateDraftSchema,
      annotations: {
        title: 'Duplicate Draft',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, draftId, name } = duplicateDraftSchema.parse(args)
        const prefix = typePath(type)
        return client.post(`${prefix}/drafts/${draftId}/duplicate`, { name })
      },
    },
    {
      name: 'archive_draft',
      description: 'Archive (delete) a draft.',
      inputSchema: typeAndDraft,
      annotations: {
        title: 'Archive Draft',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, draftId } = typeAndDraft.parse(args)
        const prefix = typePath(type)
        return client.delete(`${prefix}/drafts/${draftId}`)
      },
    },
    {
      name: 'lock_draft_for_translation',
      description: 'Lock a draft so it can be sent for translation.',
      inputSchema: typeAndDraft,
      annotations: {
        title: 'Lock Draft for Translation',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, draftId } = typeAndDraft.parse(args)
        const prefix = typePath(type)
        return client.put(`${prefix}/drafts/${draftId}/lockForTranslation`)
      },
    },
    {
      name: 'unlock_draft_for_translation',
      description: 'Unlock a draft that was previously locked for translation.',
      inputSchema: typeAndDraft,
      annotations: {
        title: 'Unlock Draft for Translation',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, draftId } = typeAndDraft.parse(args)
        const prefix = typePath(type)
        return client.delete(`${prefix}/drafts/${draftId}/lockForTranslation`)
      },
    },
    {
      name: 'get_draft_localization_keys',
      description:
        'Get all translatable string keys defined in a draft. Use this to discover what keys are available before calling set_translations.',
      inputSchema: typeAndDraft,
      annotations: {
        title: 'Get Draft Localization Keys',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { type, draftId } = typeAndDraft.parse(args)
        const prefix = typePath(type)
        return client.get(`${prefix}/drafts/${draftId}/localizationKeys`)
      },
    },
  ]
}
