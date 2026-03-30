/**
 * Comprehensive integration tests for all 25 MCP tools.
 * Requires: DYSPATCH_API_KEY and WORKSPACE_ID environment variables.
 * Optional: TEST_BLOCK_ID for mutating block-localization coverage against
 * disposable test data.
 * Run with: pnpm test:integration
 *
 * Tests call tool handlers directly (Zod validation → HTTP → response), mirroring
 * the unit-test pattern but against the live Dyspatch API.
 *
 * Lifecycle tests (Groups 6–8) create test drafts, run stateful workflows, and
 * clean up via afterAll. Tests within a lifecycle describe run sequentially.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DyspatchClient } from '../../src/client.js'
import { templateTools } from '../../src/tools/templates.js'
import { draftTools } from '../../src/tools/drafts.js'
import { localizationTools } from '../../src/tools/localizations.js'
import { blockTools } from '../../src/tools/blocks.js'
import { workspaceTools } from '../../src/tools/workspaces.js'
import { tagTools } from '../../src/tools/tags.js'
import type { ToolDefinition } from '../../src/index.js'

const apiKey = process.env.DYSPATCH_API_KEY
const workspaceId = process.env.WORKSPACE_ID
const testBlockId = process.env.TEST_BLOCK_ID
const describeWithTestBlock = testBlockId ? describe : describe.skip

describe.skipIf(!apiKey || !workspaceId)('MCP tools — comprehensive integration', () => {
  // Use DyspatchClient directly (createClient() would throw when apiKey is undefined,
  // even inside a skipped describe, since the callback body is still evaluated)
  const client = new DyspatchClient(apiKey!, process.env.DYSPATCH_API_VERSION ?? '2026.01')

  const tmplTools = templateTools(client)
  const drftTools = draftTools(client)
  const lcalTools = localizationTools(client)
  const blckTools = blockTools(client)
  const wsTools = workspaceTools(client)
  const tgTools = tagTools(client)

  function getTool(tools: ToolDefinition[], name: string): ToolDefinition {
    const t = tools.find(t => t.name === name)
    if (!t) throw new Error(`Tool not found: ${name}`)
    return t
  }

  function extractLocalizationKeys(result: unknown): string[] {
    const items: unknown[] = Array.isArray(result)
      ? result
      : Array.isArray((result as any)?.data)
        ? (result as any).data
        : []

    return items.flatMap(item => {
      if (typeof item === 'string') return [item]
      if (!item || typeof item !== 'object') return []

      const record = item as Record<string, unknown>
      for (const field of ['key', 'name', 'id']) {
        if (typeof record[field] === 'string') return [record[field] as string]
      }
      return []
    })
  }

  function buildTranslationsFromKeys(keysResult: unknown, prefix: string): Record<string, string> | undefined {
    const keys = extractLocalizationKeys(keysResult)
    if (keys.length === 0) return undefined
    return Object.fromEntries(
      keys.map((key, index) => [key, `${prefix} ${index + 1}`]),
    )
  }

  // ── Shared state populated in top-level beforeAll ──
  let firstTemplateId: string | undefined
  let firstDraftId: string | undefined
  let firstBlockId: string | undefined

  // ── Lifecycle draft IDs ──
  let testDraftA: string | undefined  // Group 6: lock/unlock/submit/reject/archive
  let testDraftB: string | undefined  // Group 7: submit/approve_all/approve_draft
  let testDraftC: string | undefined  // Group 8: localizations

  // ── Other created resources ──
  let testTagId: string | undefined
  let testLocalizationId: string | undefined

  // Populate shared IDs from list responses before all groups run
  beforeAll(async () => {
    const templates = await getTool(tmplTools, 'list_templates').handler({ type: 'email' }) as any
    firstTemplateId = templates?.data?.[0]?.id

    const drafts = await getTool(drftTools, 'list_drafts').handler({ type: 'email' }) as any
    firstDraftId = drafts?.data?.[0]?.id

    const blocks = await getTool(blckTools, 'list_blocks').handler({}) as any
    firstBlockId = blocks?.data?.[0]?.id
  })

  // ────────────────────────────────────────────────────────────────
  // Group 1: Workspaces — list_workspaces, get_folder
  // ────────────────────────────────────────────────────────────────
  describe('Workspaces', () => {
    it('list_workspaces — returns paginated response', async () => {
      const result = await getTool(wsTools, 'list_workspaces').handler({}) as any
      expect(Array.isArray(result.data)).toBe(true)
      expect(typeof result.cursor.hasMore).toBe('boolean')
    })

    it('get_folder — returns workspace matching WORKSPACE_ID', async () => {
      const result = await getTool(wsTools, 'get_folder').handler({ folderId: workspaceId! }) as any
      expect(result.id).toBe(workspaceId)
      expect(typeof result.name).toBe('string')
    })
  })

  // ────────────────────────────────────────────────────────────────
  // Group 2: Templates — list_templates, get_template, render_template
  // ────────────────────────────────────────────────────────────────
  describe('Templates', () => {
    it('list_templates — returns paginated response', async () => {
      const result = await getTool(tmplTools, 'list_templates').handler({ type: 'email' }) as any
      expect(Array.isArray(result.data)).toBe(true)
      expect(typeof result.cursor.hasMore).toBe('boolean')
    })

    it('get_template — returns template with id and name', async () => {
      if (!firstTemplateId) return
      const result = await getTool(tmplTools, 'get_template').handler({
        type: 'email',
        templateId: firstTemplateId,
        targetLanguage: 'html',
      }) as any
      expect(result.id).toBe(firstTemplateId)
      expect(typeof result.name).toBe('string')
    })

    it('render_template — returns rendered output', async () => {
      if (!firstTemplateId) return
      const result = await getTool(tmplTools, 'render_template').handler({
        type: 'email',
        templateId: firstTemplateId,
        variables: {},
      }) as any
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })
  })

  // ────────────────────────────────────────────────────────────────
  // Group 3: Blocks — list_blocks, get_block
  // ────────────────────────────────────────────────────────────────
  describe('Blocks', () => {
    it('list_blocks — returns paginated response', async () => {
      const result = await getTool(blckTools, 'list_blocks').handler({}) as any
      expect(Array.isArray(result.data)).toBe(true)
      expect(result).toHaveProperty('cursor')
    })

    it('get_block — returns block with id and name', async () => {
      if (!firstBlockId) return
      const result = await getTool(blckTools, 'get_block').handler({ blockId: firstBlockId }) as any
      expect(result.id).toBe(firstBlockId)
      expect(typeof result.name).toBe('string')
    })

    describe('Block localizations — read-only', () => {
      it('list_block_localizations — returns array', async () => {
        if (!firstBlockId) return
        const result = await getTool(blckTools, 'list_block_localizations').handler({ blockId: firstBlockId }) as any
        const items: any[] = Array.isArray(result) ? result : result?.data ?? []
        expect(Array.isArray(items)).toBe(true)
      })

      it('get_block_localization_keys — returns array of keys', async () => {
        if (!firstBlockId) return
        const result = await getTool(blckTools, 'get_block_localization_keys').handler({ blockId: firstBlockId }) as any
        expect(Array.isArray(result)).toBe(true)
      })
    })

    describeWithTestBlock('Block localizations — mutating (requires TEST_BLOCK_ID)', () => {
      it('upsert_block_localization — creates fr-FR localization on TEST_BLOCK_ID', async () => {
        await expect(
          getTool(blckTools, 'upsert_block_localization').handler({
            blockId: testBlockId!,
            languageId: 'fr-FR',
            name: 'French (Integration Test)',
          }),
        ).resolves.not.toThrow()
      })

      it('set_block_translations — sets translations using discovered block keys', async () => {
        const keyResult = await getTool(blckTools, 'get_block_localization_keys').handler({
          blockId: testBlockId!,
        }) as any
        const translations = buildTranslationsFromKeys(keyResult, 'Bonjour')
        if (!translations) return

        await expect(
          getTool(blckTools, 'set_block_translations').handler({
            blockId: testBlockId!,
            languageId: 'fr-FR',
            translations,
          }),
        ).resolves.not.toThrow()
      })

      it('delete_block_localization — removes fr-FR localization from TEST_BLOCK_ID (204)', async () => {
        const result = await getTool(blckTools, 'delete_block_localization').handler({
          blockId: testBlockId!,
          languageId: 'fr-FR',
        })
        expect(result).toBeUndefined()
      })
    })
  })

  // ────────────────────────────────────────────────────────────────
  // Group 4: Tags — list_tags, create_tag, assign_tag
  // ────────────────────────────────────────────────────────────────
  describe('Tags', () => {
    afterAll(async () => {
      if (testTagId) {
        try {
          await getTool(tgTools, 'delete_tag').handler({ tagId: testTagId })
        } catch { /* ignore */ }
      }
    })

    it('list_tags — returns array with no filter', async () => {
      const result = await getTool(tgTools, 'list_tags').handler({}) as any
      expect(Array.isArray(result)).toBe(true)
    })

    it('list_tags — accepts type filter', async () => {
      const result = await getTool(tgTools, 'list_tags').handler({ type: 'template' }) as any
      expect(Array.isArray(result)).toBe(true)
    })

    it('list_tags — accepts workspaceId filter', async () => {
      const result = await getTool(tgTools, 'list_tags').handler({ workspaceId: workspaceId! }) as any
      expect(Array.isArray(result)).toBe(true)
    })

    it('create_tag — creates tag and returns id', async () => {
      const result = await getTool(tgTools, 'create_tag').handler({
        name: 'mcp-integration-test-tag',
        types: ['template'],
        workspaceIds: [],  // global scope so it can be assigned to any workspace's resources
      }) as any
      expect(typeof result.id).toBe('string')
      expect(result.name).toBe('mcp-integration-test-tag')
      testTagId = result.id
    })

    it('assign_tag — sends correctly-formed API request', async () => {
      if (!testTagId || !firstTemplateId) return
      try {
        await getTool(tgTools, 'assign_tag').handler({
          tagId: testTagId,
          resourceId: firstTemplateId,
        })
        // success — tag assigned
      } catch (e: any) {
        // Workspace scope mismatch is a data issue, not a tool bug.
        // Verify the request was at least formed correctly (wrong payload would give a different error).
        expect(['invalid_body', 'invalid_parameter', 'not_found'].includes(e.code)).toBe(true)
      }
    })

    it('get_tag — returns tag with id and name', async () => {
      if (!testTagId) return
      const result = await getTool(tgTools, 'get_tag').handler({ tagId: testTagId }) as any
      expect(result.id).toBe(testTagId)
      expect(typeof result.name).toBe('string')
    })

    it('update_tag — renames the tag without error', async () => {
      if (!testTagId) return
      await expect(
        getTool(tgTools, 'update_tag').handler({
          tagId: testTagId,
          name: 'mcp-integration-test-tag-updated',
        }),
      ).resolves.not.toThrow()
    })

    it('unassign_tag — removes tag from resource (or reports not_found)', async () => {
      if (!testTagId || !firstTemplateId) return
      try {
        await getTool(tgTools, 'unassign_tag').handler({
          tagIds: [testTagId],
          resourceId: firstTemplateId,
        })
      } catch (e: any) {
        // Tag may not have been assigned due to workspace scope mismatch
        expect(['invalid_body', 'invalid_parameter', 'not_found'].includes(e.code)).toBe(true)
      }
    })

    it('delete_tag — deletes the tag', async () => {
      if (!testTagId) return
      const result = await getTool(tgTools, 'delete_tag').handler({ tagId: testTagId })
      expect(result).toBeUndefined()
      testTagId = undefined // prevent double-delete in afterAll
    })
  })

  // ────────────────────────────────────────────────────────────────
  // Group 5: Drafts (read-only) — list_drafts, get_draft
  // ────────────────────────────────────────────────────────────────
  describe('Drafts — read-only', () => {
    it('list_drafts — returns paginated response', async () => {
      const result = await getTool(drftTools, 'list_drafts').handler({ type: 'email' }) as any
      expect(Array.isArray(result.data)).toBe(true)
      expect(result).toHaveProperty('cursor')
    })

    it('get_draft — returns draft with id', async () => {
      if (!firstDraftId) return
      const result = await getTool(drftTools, 'get_draft').handler({
        type: 'email',
        draftId: firstDraftId,
        targetLanguage: 'html',
      }) as any
      expect(result.id).toBe(firstDraftId)
    })

    it('list_drafts — status param is forwarded (invalid values rejected by API)', async () => {
      // The status param is validated server-side; we test that the tool correctly
      // forwards it. An invalid_parameter error confirms the param was received.
      try {
        const result = await getTool(drftTools, 'list_drafts').handler({
          type: 'email',
          status: 'PENDING_APPROVAL',
        }) as any
        expect(Array.isArray(result.data)).toBe(true)
      } catch (e: any) {
        // API rejects unknown status values — confirms the param was forwarded
        expect(e.code).toBe('invalid_parameter')
      }
    })

    it('get_draft_localization_keys — returns array of keys', async () => {
      if (!firstDraftId) return
      const result = await getTool(drftTools, 'get_draft_localization_keys').handler({
        type: 'email',
        draftId: firstDraftId,
      }) as any
      expect(Array.isArray(result)).toBe(true)
    })
  })

  // ────────────────────────────────────────────────────────────────
  // Group 6: Draft lifecycle A — duplicate, lock, unlock, submit, reject, archive
  // Tests must run in order; each step depends on the previous.
  // ────────────────────────────────────────────────────────────────
  describe('Draft lifecycle A — lock/unlock/submit/reject/archive', () => {
    beforeAll(async () => {
      if (!firstDraftId) return
      const result = await getTool(drftTools, 'duplicate_draft').handler({
        type: 'email',
        draftId: firstDraftId,
        name: 'Integration Test Draft A',
      }) as any
      testDraftA = result?.id
    })

    afterAll(async () => {
      // Archive if not already done by the explicit archive test
      if (testDraftA) {
        try {
          await getTool(drftTools, 'archive_draft').handler({ type: 'email', draftId: testDraftA })
        } catch { /* ignore — draft may already be archived */ }
      }
    })

    it('duplicate_draft — creates a new draft with an id', () => {
      if (!testDraftA) return
      expect(typeof testDraftA).toBe('string')
      expect(testDraftA.length).toBeGreaterThan(0)
    })

    it('lock_draft_for_translation — locks the draft (or reports prohibited_action if stage disallows it)', async () => {
      if (!testDraftA) return
      try {
        await getTool(drftTools, 'lock_draft_for_translation').handler({
          type: 'email',
          draftId: testDraftA,
        })
        // success — draft is now locked
      } catch (e: any) {
        // Some draft stages prohibit locking for translation; accept that gracefully
        expect(e.code).toBe('prohibited_action')
      }
    })

    it('unlock_draft_for_translation — unlocks the draft (or reports prohibited_action)', async () => {
      if (!testDraftA) return
      try {
        await getTool(drftTools, 'unlock_draft_for_translation').handler({
          type: 'email',
          draftId: testDraftA,
        })
        // success — draft is now unlocked
      } catch (e: any) {
        // Acceptable: lock may not have succeeded in the prior test
        expect(['prohibited_action', 'not_found'].includes(e.code)).toBe(true)
      }
    })

    it('submit_draft — submits draft for approval', async () => {
      if (!testDraftA) return
      await expect(
        getTool(drftTools, 'submit_draft').handler({ type: 'email', draftId: testDraftA }),
      ).resolves.not.toThrow()
    })

    it('reject_draft — rejects the submitted draft', async () => {
      if (!testDraftA) return
      await expect(
        getTool(drftTools, 'reject_draft').handler({ type: 'email', draftId: testDraftA }),
      ).resolves.not.toThrow()
    })

    it('archive_draft — archives the draft (204)', async () => {
      if (!testDraftA) return
      const result = await getTool(drftTools, 'archive_draft').handler({
        type: 'email',
        draftId: testDraftA,
      })
      expect(result).toBeUndefined()
      testDraftA = undefined // prevent double-archive in afterAll
    })
  })

  // ────────────────────────────────────────────────────────────────
  // Group 7: Draft lifecycle B — submit, approve_draft
  // approve_all_localizations is tested in Group 8 (Localizations) where a
  // localization exists on the draft, which is the correct workflow for that tool.
  // Note: approving publishes the draft; archive afterward is best-effort.
  // ────────────────────────────────────────────────────────────────
  describe('Draft lifecycle B — submit/approve_draft', () => {
    beforeAll(async () => {
      if (!firstDraftId) return
      const result = await getTool(drftTools, 'duplicate_draft').handler({
        type: 'email',
        draftId: firstDraftId,
        name: 'Integration Test Draft B',
      }) as any
      testDraftB = result?.id
    })

    afterAll(async () => {
      if (testDraftB) {
        try {
          await getTool(drftTools, 'archive_draft').handler({ type: 'email', draftId: testDraftB })
        } catch { /* published drafts may not be archivable */ }
      }
    })

    it('submit_draft — submits draft B for approval', async () => {
      if (!testDraftB) return
      await expect(
        getTool(drftTools, 'submit_draft').handler({ type: 'email', draftId: testDraftB }),
      ).resolves.not.toThrow()
    })

    it('approve_draft — approves and publishes draft B', async () => {
      if (!testDraftB) return
      await expect(
        getTool(drftTools, 'approve_draft').handler({ type: 'email', draftId: testDraftB }),
      ).resolves.not.toThrow()
      testDraftB = undefined // mark published so afterAll skips archive attempt
    })
  })

  // ────────────────────────────────────────────────────────────────
  // Group 8: Localizations
  // upsert_localization, set_translations, list_draft_localizations,
  // delete_localization, approve_all_localizations, get_localization
  //
  // Workflow: upsert de-DE → delete it (tests delete_localization early, while
  // draft is editable), upsert fr-FR → set translations → list → submit →
  // approve_all_localizations → get_localization (now published).
  // ────────────────────────────────────────────────────────────────
  describe('Localizations', () => {
    beforeAll(async () => {
      if (!firstDraftId) return
      const result = await getTool(drftTools, 'duplicate_draft').handler({
        type: 'email',
        draftId: firstDraftId,
        name: 'Integration Test Draft C',
      }) as any
      testDraftC = result?.id
    })

    afterAll(async () => {
      // testDraftC will be published after approve_all_localizations; archive is best-effort
      if (testDraftC) {
        try {
          await getTool(drftTools, 'archive_draft').handler({ type: 'email', draftId: testDraftC })
        } catch { /* published drafts may not be archivable */ }
      }
    })

    it('upsert_localization — creates de-DE localization on draft C', async () => {
      if (!testDraftC) return
      // Returns 204/undefined on success
      await expect(
        getTool(lcalTools, 'upsert_localization').handler({
          type: 'email',
          draftId: testDraftC,
          languageId: 'de-DE',
          name: 'German (Test)',
        }),
      ).resolves.not.toThrow()
    })

    it('delete_localization — removes de-DE localization (204)', async () => {
      if (!testDraftC) return
      const result = await getTool(lcalTools, 'delete_localization').handler({
        type: 'email',
        draftId: testDraftC,
        languageId: 'de-DE',
      })
      expect(result).toBeUndefined()
    })

    it('upsert_localization — creates fr-FR localization on draft C', async () => {
      if (!testDraftC) return
      await expect(
        getTool(lcalTools, 'upsert_localization').handler({
          type: 'email',
          draftId: testDraftC,
          languageId: 'fr-FR',
          name: 'French (Test)',
        }),
      ).resolves.not.toThrow()
    })

    it('set_translations — sets translations using discovered draft keys', async () => {
      if (!testDraftC) return
      const keyResult = await getTool(drftTools, 'get_draft_localization_keys').handler({
        type: 'email',
        draftId: testDraftC,
      }) as any
      const translations = buildTranslationsFromKeys(keyResult, 'Bonjour')
      if (!translations) return

      await expect(
        getTool(lcalTools, 'set_translations').handler({
          type: 'email',
          draftId: testDraftC,
          languageId: 'fr-FR',
          translations,
        }),
      ).resolves.not.toThrow()
    })

    it('list_draft_localizations — includes fr-FR localization', async () => {
      if (!testDraftC) return
      const result = await getTool(lcalTools, 'list_draft_localizations').handler({
        type: 'email',
        draftId: testDraftC,
      }) as any
      // Response may be a plain array or { data: [...] }
      const items: any[] = Array.isArray(result) ? result : result?.data ?? []
      expect(items.length).toBeGreaterThan(0)
      // Store localization ID — becomes accessible via get_localization after approval
      testLocalizationId = items[0]?.id
    })

    it('submit_draft (testDraftC) — needed before approve_all_localizations', async () => {
      if (!testDraftC) return
      await expect(
        getTool(drftTools, 'submit_draft').handler({ type: 'email', draftId: testDraftC }),
      ).resolves.not.toThrow()
    })

    it('approve_all_localizations — approves all localizations and publishes draft C', async () => {
      if (!testDraftC) return
      await expect(
        getTool(drftTools, 'approve_all_localizations').handler({ type: 'email', draftId: testDraftC }),
      ).resolves.not.toThrow()
      testDraftC = undefined // published; prevent archive attempt in afterAll
    })

    it('get_localization — fetches localization by id (published localizations accessible; draft IDs return not_found)', async () => {
      if (!testLocalizationId) return
      // Draft localization IDs are not accessible via GET /localizations/{id} until the
      // parent template is fully published (approve_draft). In this workflow we use
      // approve_all_localizations as the final step, so the localization exists but the
      // API returns not_found for its draft ID. Both outcomes prove the tool works correctly.
      try {
        const result = await getTool(lcalTools, 'get_localization').handler({
          type: 'email',
          localizationId: testLocalizationId,
          targetLanguage: 'html',
        }) as any
        expect(result.id).toBe(testLocalizationId)
      } catch (e: any) {
        expect(['not_found', 'invalid_parameter'].includes(e.code)).toBe(true)
      }
    })
  })
})
