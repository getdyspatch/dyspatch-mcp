import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import type { ToolDefinition } from '../src/index.js'
import { handleCallTool } from '../src/index.js'

function makeTools(...tools: ToolDefinition[]) {
  return new Map(tools.map((t) => [t.name, t]))
}

const dummySchema = z.object({})

describe('handleCallTool', () => {
  it('returns JSON text for a handler that returns data', async () => {
    const tools = makeTools({
      name: 'get_thing',
      description: 'gets a thing',
      inputSchema: dummySchema,
      handler: async () => ({ id: 'abc', name: 'Test' }),
    })

    const res = await handleCallTool('get_thing', {}, tools)

    expect(res.isError).toBeUndefined()
    expect(res.content).toHaveLength(1)
    expect(res.content[0].type).toBe('text')
    expect(JSON.parse(res.content[0].text)).toEqual({ id: 'abc', name: 'Test' })
  })

  it('returns "OK" text for a handler that returns undefined (204 No Content)', async () => {
    const tools = makeTools({
      name: 'delete_thing',
      description: 'deletes a thing',
      inputSchema: dummySchema,
      handler: async () => undefined,
    })

    const res = await handleCallTool('delete_thing', {}, tools)

    expect(res.isError).toBeUndefined()
    expect(res.content).toHaveLength(1)
    expect(res.content[0].type).toBe('text')
    expect(res.content[0].text).toBe('OK')
  })

  it('returns an error for an unknown tool name', async () => {
    const res = await handleCallTool('nonexistent', {}, makeTools())

    expect(res.isError).toBe(true)
    expect(res.content[0].text).toBe('Unknown tool: nonexistent')
  })

  it('returns an error when the handler throws', async () => {
    const tools = makeTools({
      name: 'fail_thing',
      description: 'always fails',
      inputSchema: dummySchema,
      handler: async () => { throw new Error('something broke') },
    })

    const res = await handleCallTool('fail_thing', {}, tools)

    expect(res.isError).toBe(true)
    expect(res.content[0].text).toBe('Error: something broke')
  })

  it('passes arguments through to the handler', async () => {
    let received: unknown
    const tools = makeTools({
      name: 'echo',
      description: 'echoes args',
      inputSchema: dummySchema,
      handler: async (args) => { received = args; return args },
    })

    await handleCallTool('echo', { foo: 'bar' }, tools)

    expect(received).toEqual({ foo: 'bar' })
  })

  it('content[0].text is always a string', async () => {
    const cases: Array<{ name: string; handler: () => Promise<unknown> }> = [
      { name: 'returns_null', handler: async () => null },
      { name: 'returns_zero', handler: async () => 0 },
      { name: 'returns_empty', handler: async () => '' },
      { name: 'returns_array', handler: async () => [1, 2] },
      { name: 'returns_undefined', handler: async () => undefined },
    ]

    for (const { name, handler } of cases) {
      const tools = makeTools({
        name,
        description: name,
        inputSchema: dummySchema,
        handler,
      })

      const res = await handleCallTool(name, {}, tools)
      expect(typeof res.content[0].text).toBe('string')
    }
  })
})
