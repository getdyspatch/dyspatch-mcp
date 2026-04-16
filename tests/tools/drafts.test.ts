import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { draftTools } from '../../src/tools/drafts.js'
import { makeMockClient } from '../helpers.js'

function setup() {
  const client = makeMockClient()
  const tools = draftTools(client)
  const get = (name: string) => tools.find((t) => t.name === name)!
  return { client, get }
}

const BASE_ARGS = { type: 'email', draftId: 'tdft_123' }

describe('list_drafts', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({ data: [] })
  })

  it('GET /drafts for email', async () => {
    await ctx.get('list_drafts').handler({ type: 'email' })
    expect(ctx.client.get).toHaveBeenCalledWith('/drafts', { cursor: undefined, status: undefined })
  })

  it('GET /sms/drafts for sms', async () => {
    await ctx.get('list_drafts').handler({ type: 'sms' })
    expect(ctx.client.get).toHaveBeenCalledWith('/sms/drafts', { cursor: undefined, status: undefined })
  })

  it('forwards cursor', async () => {
    await ctx.get('list_drafts').handler({ type: 'email', cursor: 'abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/drafts', { cursor: 'abc', status: undefined })
  })

  it('forwards status filter', async () => {
    await ctx.get('list_drafts').handler({ type: 'email', status: 'PENDING_APPROVAL' })
    expect(ctx.client.get).toHaveBeenCalledWith('/drafts', { cursor: undefined, status: 'PENDING_APPROVAL' })
  })

  it('throws on invalid type', async () => {
    await expect(ctx.get('list_drafts').handler({ type: 'invalid' })).rejects.toThrow()
  })
})

describe('get_draft', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({})
  })

  it('GET /drafts/{id}', async () => {
    await ctx.get('get_draft').handler({ ...BASE_ARGS, targetLanguage: 'html' })
    expect(ctx.client.get).toHaveBeenCalledWith('/drafts/tdft_123', {
      targetLanguage: 'html',
      themeId: undefined,
    })
  })

  it('forwards targetLanguage and themeId as query params', async () => {
    await ctx.get('get_draft').handler({ ...BASE_ARGS, targetLanguage: 'handlebars', themeId: 'thm_1' })
    expect(ctx.client.get).toHaveBeenCalledWith('/drafts/tdft_123', {
      targetLanguage: 'handlebars',
      themeId: 'thm_1',
    })
  })

  it('uses channel prefix for push', async () => {
    await ctx.get('get_draft').handler({ type: 'push', draftId: 'tdft_abc', targetLanguage: 'html' })
    expect(ctx.client.get).toHaveBeenCalledWith('/push/drafts/tdft_abc', expect.any(Object))
  })
})

describe('submit_draft', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.post = vi.fn().mockResolvedValue({})
  })

  it('POST /drafts/{id}/publishRequest with no body', async () => {
    await ctx.get('submit_draft').handler(BASE_ARGS)
    expect(ctx.client.post).toHaveBeenCalledWith('/drafts/tdft_123/publishRequest')
  })

  it('uses channel prefix for sms', async () => {
    await ctx.get('submit_draft').handler({ type: 'sms', draftId: 'tdft_abc' })
    expect(ctx.client.post).toHaveBeenCalledWith('/sms/drafts/tdft_abc/publishRequest')
  })
})

describe('approve_draft', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.postText = vi.fn().mockResolvedValue({})
  })

  it('POST /drafts/{id}/publish/approve with no feedback', async () => {
    await ctx.get('approve_draft').handler(BASE_ARGS)
    expect(ctx.client.postText).toHaveBeenCalledWith('/drafts/tdft_123/publish/approve', undefined)
  })

  it('POST /drafts/{id}/publish/approve with feedback', async () => {
    await ctx.get('approve_draft').handler({ ...BASE_ARGS, feedback: 'Looks good!' })
    expect(ctx.client.postText).toHaveBeenCalledWith('/drafts/tdft_123/publish/approve', 'Looks good!')
  })
})

describe('approve_all_localizations', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.post = vi.fn().mockResolvedValue({})
  })

  it('POST /drafts/{id}/publish/approveAll', async () => {
    await ctx.get('approve_all_localizations').handler(BASE_ARGS)
    expect(ctx.client.post).toHaveBeenCalledWith('/drafts/tdft_123/publish/approveAll')
  })
})

describe('reject_draft', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.postText = vi.fn().mockResolvedValue({})
  })

  it('POST /drafts/{id}/publish/reject with no feedback', async () => {
    await ctx.get('reject_draft').handler(BASE_ARGS)
    expect(ctx.client.postText).toHaveBeenCalledWith('/drafts/tdft_123/publish/reject', undefined)
  })

  it('POST /drafts/{id}/publish/reject with feedback', async () => {
    await ctx.get('reject_draft').handler({ ...BASE_ARGS, feedback: 'Subject line is too long.' })
    expect(ctx.client.postText).toHaveBeenCalledWith('/drafts/tdft_123/publish/reject', 'Subject line is too long.')
  })
})

describe('duplicate_draft', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.post = vi.fn().mockResolvedValue({})
  })

  it('POST /drafts/{id}/duplicate with name body', async () => {
    await ctx.get('duplicate_draft').handler({ ...BASE_ARGS, name: 'Copy of draft' })
    expect(ctx.client.post).toHaveBeenCalledWith('/drafts/tdft_123/duplicate', { name: 'Copy of draft' })
  })

  it('throws on missing name', async () => {
    await expect(ctx.get('duplicate_draft').handler(BASE_ARGS)).rejects.toThrow()
  })
})

describe('archive_draft', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.delete = vi.fn().mockResolvedValue(undefined)
  })

  it('DELETE /drafts/{id}', async () => {
    await ctx.get('archive_draft').handler(BASE_ARGS)
    expect(ctx.client.delete).toHaveBeenCalledWith('/drafts/tdft_123')
  })

  it('uses channel prefix for voice', async () => {
    await ctx.get('archive_draft').handler({ type: 'voice', draftId: 'tdft_abc' })
    expect(ctx.client.delete).toHaveBeenCalledWith('/voice/drafts/tdft_abc')
  })
})

describe('lock_draft_for_translation', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.put = vi.fn().mockResolvedValue({})
  })

  it('PUT /drafts/{id}/lockForTranslation', async () => {
    await ctx.get('lock_draft_for_translation').handler(BASE_ARGS)
    expect(ctx.client.put).toHaveBeenCalledWith('/drafts/tdft_123/lockForTranslation')
  })
})

describe('unlock_draft_for_translation', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.delete = vi.fn().mockResolvedValue(undefined)
  })

  it('DELETE /drafts/{id}/lockForTranslation', async () => {
    await ctx.get('unlock_draft_for_translation').handler(BASE_ARGS)
    expect(ctx.client.delete).toHaveBeenCalledWith('/drafts/tdft_123/lockForTranslation')
  })
})

describe('get_draft_localization_keys', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue([])
  })

  it('GET /drafts/{id}/localizationKeys for email', async () => {
    await ctx.get('get_draft_localization_keys').handler(BASE_ARGS)
    expect(ctx.client.get).toHaveBeenCalledWith('/drafts/tdft_123/localizationKeys')
  })

  it('uses channel prefix for sms', async () => {
    await ctx.get('get_draft_localization_keys').handler({ type: 'sms', draftId: 'tdft_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/sms/drafts/tdft_abc/localizationKeys')
  })

  it('throws on missing draftId', async () => {
    await expect(ctx.get('get_draft_localization_keys').handler({ type: 'email' })).rejects.toThrow()
  })
})

describe('Zod validation', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => { ctx = setup() })

  it('throws when draftId is missing', async () => {
    await expect(ctx.get('get_draft').handler({ type: 'email' })).rejects.toThrow()
  })

  it('throws when type is invalid', async () => {
    await expect(ctx.get('submit_draft').handler({ type: 'carrier-pigeon', draftId: 'tdft_1' })).rejects.toThrow()
  })
})
