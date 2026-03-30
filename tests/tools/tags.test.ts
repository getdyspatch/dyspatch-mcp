import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { tagTools } from '../../src/tools/tags.js'
import { makeMockClient } from '../helpers.js'

function setup() {
  const client = makeMockClient()
  const tools = tagTools(client)
  const get = (name: string) => tools.find((t) => t.name === name)!
  return { client, get }
}

describe('list_tags', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({ data: [] })
  })

  it('GET /tags with no filters', async () => {
    await ctx.get('list_tags').handler({})
    expect(ctx.client.get).toHaveBeenCalledWith('/tags', {
      type: undefined,
      workspaceId: undefined,
      cursor: undefined,
    })
  })

  it('forwards type filter', async () => {
    await ctx.get('list_tags').handler({ type: 'draft' })
    expect(ctx.client.get).toHaveBeenCalledWith('/tags', expect.objectContaining({ type: 'draft' }))
  })

  it('forwards workspaceId filter', async () => {
    await ctx.get('list_tags').handler({ workspaceId: 'ws_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/tags', expect.objectContaining({ workspaceId: 'ws_abc' }))
  })

  it('forwards cursor', async () => {
    await ctx.get('list_tags').handler({ cursor: 'page2' })
    expect(ctx.client.get).toHaveBeenCalledWith('/tags', expect.objectContaining({ cursor: 'page2' }))
  })

  it('throws on invalid tag type', async () => {
    await expect(ctx.get('list_tags').handler({ type: 'workspace' })).rejects.toThrow()
  })
})

describe('create_tag', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.post = vi.fn().mockResolvedValue({})
  })

  it('POST /tags/create with required fields', async () => {
    await ctx.get('create_tag').handler({ name: 'urgent', types: ['template', 'draft'] })
    expect(ctx.client.post).toHaveBeenCalledWith('/tags/create', {
      name: 'urgent',
      types: ['template', 'draft'],
      workspaceIds: [],
    })
  })

  it('converts undefined workspaceIds to empty array', async () => {
    await ctx.get('create_tag').handler({ name: 'global', types: ['block'] })
    const [, body] = (ctx.client.post as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(body.workspaceIds).toEqual([])
  })

  it('passes provided workspaceIds', async () => {
    await ctx.get('create_tag').handler({ name: 'scoped', types: ['template'], workspaceIds: ['ws_1', 'ws_2'] })
    const [, body] = (ctx.client.post as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(body.workspaceIds).toEqual(['ws_1', 'ws_2'])
  })

  it('throws on missing name', async () => {
    await expect(ctx.get('create_tag').handler({ types: ['draft'] })).rejects.toThrow()
  })

  it('throws on missing types', async () => {
    await expect(ctx.get('create_tag').handler({ name: 'tag' })).rejects.toThrow()
  })

  it('throws on invalid tag type in array', async () => {
    await expect(ctx.get('create_tag').handler({ name: 'tag', types: ['invalid'] })).rejects.toThrow()
  })
})

describe('assign_tag', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.put = vi.fn().mockResolvedValue({})
  })

  it('PUT /tags/assign/{resourceId} with tagIds array body', async () => {
    await ctx.get('assign_tag').handler({ tagId: 'tag_1', resourceId: 'tem_abc' })
    expect(ctx.client.put).toHaveBeenCalledWith('/tags/assign/tem_abc', { tagIds: ['tag_1'] })
  })

  it('throws on missing tagId', async () => {
    await expect(ctx.get('assign_tag').handler({ resourceId: 'tem_abc' })).rejects.toThrow()
  })

  it('throws on missing resourceId', async () => {
    await expect(ctx.get('assign_tag').handler({ tagId: 'tag_1' })).rejects.toThrow()
  })
})

describe('get_tag', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({})
  })

  it('GET /tags/{tagId}', async () => {
    await ctx.get('get_tag').handler({ tagId: 'tag_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/tags/tag_abc')
  })

  it('throws on missing tagId', async () => {
    await expect(ctx.get('get_tag').handler({})).rejects.toThrow()
  })
})

describe('update_tag', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.patch = vi.fn().mockResolvedValue({})
  })

  it('PATCH /tags/update/{tagId} with partial fields', async () => {
    await ctx.get('update_tag').handler({ tagId: 'tag_abc', name: 'renamed' })
    expect(ctx.client.patch).toHaveBeenCalledWith('/tags/update/tag_abc', expect.objectContaining({ name: 'renamed' }))
  })

  it('accepts valid status enum values', async () => {
    await ctx.get('update_tag').handler({ tagId: 'tag_abc', status: 'inactive' })
    expect(ctx.client.patch).toHaveBeenCalledWith('/tags/update/tag_abc', expect.objectContaining({ status: 'inactive' }))
  })

  it('throws on invalid status', async () => {
    await expect(ctx.get('update_tag').handler({ tagId: 'tag_abc', status: 'deleted' })).rejects.toThrow()
  })

  it('throws on missing tagId', async () => {
    await expect(ctx.get('update_tag').handler({ name: 'renamed' })).rejects.toThrow()
  })
})

describe('delete_tag', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.delete = vi.fn().mockResolvedValue(undefined)
  })

  it('DELETE /tags/delete/{tagId}', async () => {
    await ctx.get('delete_tag').handler({ tagId: 'tag_abc' })
    expect(ctx.client.delete).toHaveBeenCalledWith('/tags/delete/tag_abc')
  })

  it('throws on missing tagId', async () => {
    await expect(ctx.get('delete_tag').handler({})).rejects.toThrow()
  })
})

describe('unassign_tag', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.post = vi.fn().mockResolvedValue({})
  })

  it('POST /tags/unassign/{resourceId} once per tagId with singular tagId body', async () => {
    await ctx.get('unassign_tag').handler({ tagIds: ['tag_1', 'tag_2'], resourceId: 'tem_abc' })
    expect(ctx.client.post).toHaveBeenCalledTimes(2)
    expect(ctx.client.post).toHaveBeenNthCalledWith(1, '/tags/unassign/tem_abc', { tagId: 'tag_1' })
    expect(ctx.client.post).toHaveBeenNthCalledWith(2, '/tags/unassign/tem_abc', { tagId: 'tag_2' })
  })

  it('throws on missing tagIds', async () => {
    await expect(ctx.get('unassign_tag').handler({ resourceId: 'tem_abc' })).rejects.toThrow()
  })

  it('throws on missing resourceId', async () => {
    await expect(ctx.get('unassign_tag').handler({ tagIds: ['tag_1'] })).rejects.toThrow()
  })
})
