import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { workspaceTools } from '../../src/tools/workspaces.js'
import { makeMockClient } from '../helpers.js'

function setup() {
  const client = makeMockClient()
  const tools = workspaceTools(client)
  const get = (name: string) => tools.find((t) => t.name === name)!
  return { client, get }
}

describe('list_workspaces', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({ data: [] })
  })

  it('GET /workspaces with no cursor', async () => {
    await ctx.get('list_workspaces').handler({})
    expect(ctx.client.get).toHaveBeenCalledWith('/workspaces', { cursor: undefined })
  })

  it('forwards cursor', async () => {
    await ctx.get('list_workspaces').handler({ cursor: 'next-page' })
    expect(ctx.client.get).toHaveBeenCalledWith('/workspaces', { cursor: 'next-page' })
  })
})

describe('get_folder', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({})
  })

  it('GET /workspaces/{folderId}', async () => {
    await ctx.get('get_folder').handler({ folderId: 'fol_xyz' })
    expect(ctx.client.get).toHaveBeenCalledWith('/workspaces/fol_xyz')
  })

  it('throws on missing folderId', async () => {
    await expect(ctx.get('get_folder').handler({})).rejects.toThrow()
  })
})
