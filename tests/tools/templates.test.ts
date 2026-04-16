import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { templateTools } from '../../src/tools/templates.js'
import { makeMockClient } from '../helpers.js'

function setup() {
  const client = makeMockClient()
  const tools = templateTools(client)
  const get = (name: string) => tools.find((t) => t.name === name)!
  return { client, get }
}

describe('list_templates', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({ data: [] })
  })

  it('GET /templates for email (no prefix)', async () => {
    await ctx.get('list_templates').handler({ type: 'email' })
    expect(ctx.client.get).toHaveBeenCalledWith('/templates', { cursor: undefined })
  })

  it('GET /sms/templates for sms', async () => {
    await ctx.get('list_templates').handler({ type: 'sms' })
    expect(ctx.client.get).toHaveBeenCalledWith('/sms/templates', { cursor: undefined })
  })

  it('GET /push/templates for push', async () => {
    await ctx.get('list_templates').handler({ type: 'push' })
    expect(ctx.client.get).toHaveBeenCalledWith('/push/templates', { cursor: undefined })
  })

  it('GET /voice/templates for voice', async () => {
    await ctx.get('list_templates').handler({ type: 'voice' })
    expect(ctx.client.get).toHaveBeenCalledWith('/voice/templates', { cursor: undefined })
  })

  it('GET /liveactivity/templates for liveactivity', async () => {
    await ctx.get('list_templates').handler({ type: 'liveactivity' })
    expect(ctx.client.get).toHaveBeenCalledWith('/liveactivity/templates', { cursor: undefined })
  })

  it('forwards pagination cursor', async () => {
    await ctx.get('list_templates').handler({ type: 'email', cursor: 'page2' })
    expect(ctx.client.get).toHaveBeenCalledWith('/templates', { cursor: 'page2' })
  })

  it('throws on invalid type', async () => {
    await expect(ctx.get('list_templates').handler({ type: 'fax' })).rejects.toThrow()
  })

  it('throws on missing type', async () => {
    await expect(ctx.get('list_templates').handler({})).rejects.toThrow()
  })
})

describe('get_template', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({})
  })

  it('GET /templates/{id} for email', async () => {
    await ctx.get('get_template').handler({ type: 'email', templateId: 'tem_abc', targetLanguage: 'html' })
    expect(ctx.client.get).toHaveBeenCalledWith('/templates/tem_abc', { targetLanguage: 'html', themeId: undefined })
  })

  it('GET /sms/templates/{id} for sms', async () => {
    await ctx.get('get_template').handler({ type: 'sms', templateId: 'tem_xyz', targetLanguage: 'html' })
    expect(ctx.client.get).toHaveBeenCalledWith('/sms/templates/tem_xyz', { targetLanguage: 'html', themeId: undefined })
  })

  it('forwards targetLanguage as query param', async () => {
    await ctx.get('get_template').handler({ type: 'email', templateId: 'tem_abc', targetLanguage: 'handlebars' })
    expect(ctx.client.get).toHaveBeenCalledWith('/templates/tem_abc', { targetLanguage: 'handlebars', themeId: undefined })
  })

  it('forwards themeId as query param', async () => {
    await ctx.get('get_template').handler({ type: 'email', templateId: 'tem_abc', targetLanguage: 'html', themeId: 'thm_1' })
    expect(ctx.client.get).toHaveBeenCalledWith('/templates/tem_abc', { targetLanguage: 'html', themeId: 'thm_1' })
  })

  it('throws on missing templateId', async () => {
    await expect(ctx.get('get_template').handler({ type: 'email' })).rejects.toThrow()
  })
})

describe('render_template', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.post = vi.fn().mockResolvedValue({})
  })

  it('POST /render/template/{id} without languageId', async () => {
    await ctx.get('render_template').handler({ type: 'email', templateId: 'tem_abc' })
    expect(ctx.client.post).toHaveBeenCalledWith('/render/template/tem_abc', {})
  })

  it('POST /render/template/{id}/{lang} with languageId', async () => {
    await ctx.get('render_template').handler({ type: 'email', templateId: 'tem_abc', languageId: 'en-US' })
    expect(ctx.client.post).toHaveBeenCalledWith('/render/template/tem_abc/en-US', {})
  })

  it('sends variables as body', async () => {
    await ctx.get('render_template').handler({
      type: 'email',
      templateId: 'tem_abc',
      variables: { firstName: 'Alice', total: 42 },
    })
    expect(ctx.client.post).toHaveBeenCalledWith('/render/template/tem_abc', { firstName: 'Alice', total: 42 })
  })

  it('appends themeId as query param', async () => {
    await ctx.get('render_template').handler({ type: 'email', templateId: 'tem_abc', themeId: 'thm_1' })
    expect(ctx.client.post).toHaveBeenCalledWith('/render/template/tem_abc?themeId=thm_1', {})
  })

  it('uses channel prefix for sms render', async () => {
    await ctx.get('render_template').handler({ type: 'sms', templateId: 'tem_abc' })
    expect(ctx.client.post).toHaveBeenCalledWith('/sms/render/template/tem_abc', {})
  })

  it('throws on missing templateId', async () => {
    await expect(ctx.get('render_template').handler({ type: 'email' })).rejects.toThrow()
  })
})
