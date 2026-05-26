import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { customerProfileTools } from '../../src/tools/customerProfiles.js'
import { makeMockClient } from '../helpers.js'

function setup() {
  const client = makeMockClient()
  const tools = customerProfileTools(client)
  const get = (name: string) => tools.find((t) => t.name === name)!
  return { client, get }
}

describe('list_customer_profiles', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({ data: [] })
  })

  it('GET /customerprofiles with no params', async () => {
    await ctx.get('list_customer_profiles').handler({})
    expect(ctx.client.get).toHaveBeenCalledWith('/customerprofiles', { cursor: undefined, workspaceId: undefined })
  })

  it('forwards cursor', async () => {
    await ctx.get('list_customer_profiles').handler({ cursor: 'page2' })
    expect(ctx.client.get).toHaveBeenCalledWith('/customerprofiles', { cursor: 'page2', workspaceId: undefined })
  })

  it('forwards workspaceId filter', async () => {
    await ctx.get('list_customer_profiles').handler({ workspaceId: 'fdr_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/customerprofiles', { cursor: undefined, workspaceId: 'fdr_abc' })
  })
})

describe('get_customer_profile', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
    ctx.client.get = vi.fn().mockResolvedValue({})
  })

  it('GET /customerprofiles/{id}', async () => {
    await ctx.get('get_customer_profile').handler({ customerProfileId: 'dat_abc' })
    expect(ctx.client.get).toHaveBeenCalledWith('/customerprofiles/dat_abc')
  })

  it('throws on missing customerProfileId', async () => {
    await expect(ctx.get('get_customer_profile').handler({})).rejects.toThrow()
  })
})
