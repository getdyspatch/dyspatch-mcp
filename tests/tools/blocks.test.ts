import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { blockTools } from '../../src/tools/blocks.js'
import { makeMockClient } from '../helpers.js'

function setup() {
  const client = makeMockClient()
  const tools = blockTools(client)
  const get = (name: string) => tools.find((t) => t.name === name)!
  return { client, get }
}

describe('list_blocks', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({ data: [] })
  })

  it('GET /blocks with no cursor', async () => {
    await ctx.get('list_blocks').handler({})
    expect(ctx.client.get).toHaveBeenCalledWith('/blocks', { cursor: undefined })
  })

  it('forwards cursor', async () => {
    await ctx.get('list_blocks').handler({ cursor: 'page2' })
    expect(ctx.client.get).toHaveBeenCalledWith('/blocks', { cursor: 'page2' })
  })
})

describe('get_block', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({})
  })

  it('GET /blocks/{blockId}', async () => {
    await ctx.get('get_block').handler({ blockId: 'blo_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/blocks/blo_abc')
  })

  it('throws on missing blockId', async () => {
    await expect(ctx.get('get_block').handler({})).rejects.toThrow()
  })
})

describe('list_block_localizations', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue([])
  })

  it('GET /blocks/{blockId}/localizations', async () => {
    await ctx.get('list_block_localizations').handler({ blockId: 'blo_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/blocks/blo_abc/localizations')
  })

  it('throws on missing blockId', async () => {
    await expect(ctx.get('list_block_localizations').handler({})).rejects.toThrow()
  })
})

describe('get_block_localization_keys', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue([])
  })

  it('GET /blocks/{blockId}/localizationKeys', async () => {
    await ctx.get('get_block_localization_keys').handler({ blockId: 'blo_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/blocks/blo_abc/localizationKeys')
  })

  it('throws on missing blockId', async () => {
    await expect(ctx.get('get_block_localization_keys').handler({})).rejects.toThrow()
  })
})

describe('upsert_block_localization', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.put = vi.fn().mockResolvedValue(undefined)
  })

  it('PUT /blocks/{blockId}/localizations/{lang} with name body', async () => {
    await ctx.get('upsert_block_localization').handler({ blockId: 'blo_abc', languageId: 'fr-FR', name: 'French' })
    expect(ctx.client.put).toHaveBeenCalledWith('/blocks/blo_abc/localizations/fr-FR', { name: 'French' })
  })

  it('throws on missing name', async () => {
    await expect(ctx.get('upsert_block_localization').handler({ blockId: 'blo_abc', languageId: 'fr-FR' })).rejects.toThrow()
  })
})

describe('delete_block_localization', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.delete = vi.fn().mockResolvedValue(undefined)
  })

  it('DELETE /blocks/{blockId}/localizations/{lang}', async () => {
    await ctx.get('delete_block_localization').handler({ blockId: 'blo_abc', languageId: 'fr-FR' })
    expect(ctx.client.delete).toHaveBeenCalledWith('/blocks/blo_abc/localizations/fr-FR')
  })

  it('throws on missing languageId', async () => {
    await expect(ctx.get('delete_block_localization').handler({ blockId: 'blo_abc' })).rejects.toThrow()
  })
})

describe('set_block_translations', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.put = vi.fn().mockResolvedValue(undefined)
  })

  it('PUT /blocks/{blockId}/localizations/{lang}/translations with map', async () => {
    const translations = { greeting: 'Bonjour' }
    await ctx.get('set_block_translations').handler({ blockId: 'blo_abc', languageId: 'fr-FR', translations })
    expect(ctx.client.put).toHaveBeenCalledWith('/blocks/blo_abc/localizations/fr-FR/translations', translations)
  })

  it('throws on missing translations', async () => {
    await expect(ctx.get('set_block_translations').handler({ blockId: 'blo_abc', languageId: 'fr-FR' })).rejects.toThrow()
  })
})
