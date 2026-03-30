import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { localizationTools } from '../../src/tools/localizations.js'
import { makeMockClient } from '../helpers.js'

function setup() {
  const client = makeMockClient()
  const tools = localizationTools(client)
  const get = (name: string) => tools.find((t) => t.name === name)!
  return { client, get }
}

const DRAFT_ARGS = { type: 'email', draftId: 'tdft_123' }
const LANG_ARGS = { ...DRAFT_ARGS, languageId: 'fr-FR' }

describe('list_draft_localizations', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({ data: [] })
  })

  it('GET /drafts/{id}/localizations', async () => {
    await ctx.get('list_draft_localizations').handler(DRAFT_ARGS)
    expect(ctx.client.get).toHaveBeenCalledWith('/drafts/tdft_123/localizations')
  })

  it('uses channel prefix for sms', async () => {
    await ctx.get('list_draft_localizations').handler({ type: 'sms', draftId: 'tdft_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/sms/drafts/tdft_abc/localizations')
  })

  it('throws on missing draftId', async () => {
    await expect(ctx.get('list_draft_localizations').handler({ type: 'email' })).rejects.toThrow()
  })
})

describe('get_localization', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({})
  })

  it('GET /localizations/{localizationId}', async () => {
    await ctx.get('get_localization').handler({ type: 'email', localizationId: 'loc_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/localizations/loc_abc', { targetLanguage: undefined, themeId: undefined })
  })

  it('uses channel prefix for push', async () => {
    await ctx.get('get_localization').handler({ type: 'push', localizationId: 'loc_xyz' })
    expect(ctx.client.get).toHaveBeenCalledWith('/push/localizations/loc_xyz', { targetLanguage: undefined, themeId: undefined })
  })

  it('forwards targetLanguage as query param', async () => {
    await ctx.get('get_localization').handler({ type: 'email', localizationId: 'loc_abc', targetLanguage: 'html' })
    expect(ctx.client.get).toHaveBeenCalledWith('/localizations/loc_abc', { targetLanguage: 'html', themeId: undefined })
  })

  it('forwards themeId as query param', async () => {
    await ctx.get('get_localization').handler({ type: 'email', localizationId: 'loc_abc', themeId: 'thm_1' })
    expect(ctx.client.get).toHaveBeenCalledWith('/localizations/loc_abc', { targetLanguage: undefined, themeId: 'thm_1' })
  })

  it('throws on missing localizationId', async () => {
    await expect(ctx.get('get_localization').handler({ type: 'email' })).rejects.toThrow()
  })
})

describe('upsert_localization', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.put = vi.fn().mockResolvedValue({})
  })

  it('PUT /drafts/{id}/localizations/{lang} with name body', async () => {
    await ctx.get('upsert_localization').handler({ ...LANG_ARGS, name: 'French' })
    expect(ctx.client.put).toHaveBeenCalledWith(
      '/drafts/tdft_123/localizations/fr-FR',
      { name: 'French' },
    )
  })

  it('uses channel prefix for sms', async () => {
    await ctx.get('upsert_localization').handler({ type: 'sms', draftId: 'tdft_abc', languageId: 'de-DE', name: 'German' })
    expect(ctx.client.put).toHaveBeenCalledWith('/sms/drafts/tdft_abc/localizations/de-DE', { name: 'German' })
  })

  it('throws on missing name', async () => {
    await expect(ctx.get('upsert_localization').handler(LANG_ARGS)).rejects.toThrow()
  })
})

describe('delete_localization', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.delete = vi.fn().mockResolvedValue(undefined)
  })

  it('DELETE /drafts/{id}/localizations/{lang}', async () => {
    await ctx.get('delete_localization').handler(LANG_ARGS)
    expect(ctx.client.delete).toHaveBeenCalledWith('/drafts/tdft_123/localizations/fr-FR')
  })

  it('throws on missing languageId', async () => {
    await expect(ctx.get('delete_localization').handler(DRAFT_ARGS)).rejects.toThrow()
  })
})

describe('set_translations', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.put = vi.fn().mockResolvedValue({})
  })

  it('PUT /drafts/{id}/localizations/{lang}/translations with full map', async () => {
    const translations = { greeting: 'Bonjour', farewell: 'Au revoir' }
    await ctx.get('set_translations').handler({ ...LANG_ARGS, translations })
    expect(ctx.client.put).toHaveBeenCalledWith(
      '/drafts/tdft_123/localizations/fr-FR/translations',
      translations,
    )
  })

  it('sends empty map (replaces all translations)', async () => {
    await ctx.get('set_translations').handler({ ...LANG_ARGS, translations: {} })
    expect(ctx.client.put).toHaveBeenCalledWith(
      '/drafts/tdft_123/localizations/fr-FR/translations',
      {},
    )
  })

  it('throws on missing translations', async () => {
    await expect(ctx.get('set_translations').handler(LANG_ARGS)).rejects.toThrow()
  })
})
