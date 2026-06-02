import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { themeTools } from '../../src/tools/themes.js'
import { makeMockClient } from '../helpers.js'

function setup() {
  const client = makeMockClient()
  const tools = themeTools(client)
  const get = (name: string) => tools.find((t) => t.name === name)!
  return { client, get }
}

describe('list_themes', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({ data: [] })
  })

  it('GET /themes with no cursor', async () => {
    await ctx.get('list_themes').handler({})
    expect(ctx.client.get).toHaveBeenCalledWith('/themes', { cursor: undefined })
  })

  it('forwards cursor', async () => {
    await ctx.get('list_themes').handler({ cursor: 'page2' })
    expect(ctx.client.get).toHaveBeenCalledWith('/themes', { cursor: 'page2' })
  })
})

describe('get_theme', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({})
  })

  it('GET /themes/{themeId}', async () => {
    await ctx.get('get_theme').handler({ themeId: 'thm_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/themes/thm_abc')
  })

  it('throws on missing themeId', async () => {
    await expect(ctx.get('get_theme').handler({})).rejects.toThrow()
  })
})
