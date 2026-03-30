import { vi } from 'vitest'
import type { DyspatchClient } from '../src/client.js'

export function makeMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    postText: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as DyspatchClient
}
