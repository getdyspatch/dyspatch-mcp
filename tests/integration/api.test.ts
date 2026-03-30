/**
 * Integration tests against the live Dyspatch API.
 * Requires: DYSPATCH_API_KEY environment variable.
 * Run with: pnpm test:integration
 *
 * All operations are read-only (GET requests only).
 */
import { describe, it, expect } from 'vitest'
import { DyspatchClient } from '../../src/client.js'

const apiKey = process.env.DYSPATCH_API_KEY

describe.skipIf(!apiKey)('Dyspatch API — live integration', () => {
  const client = new DyspatchClient(apiKey!)

  describe('list_templates (email)', () => {
    it('returns a paginated response with data and cursor', async () => {
      const result = await client.get<{ data: unknown[]; cursor: { hasMore: boolean; next?: string } }>(
        '/templates',
      )
      expect(result).toHaveProperty('data')
      expect(Array.isArray(result.data)).toBe(true)
      expect(result).toHaveProperty('cursor')
      expect(typeof result.cursor.hasMore).toBe('boolean')
    })
  })

  describe('list_blocks', () => {
    it('returns a paginated response', async () => {
      const result = await client.get<{ data: unknown[]; cursor: { hasMore: boolean } }>('/blocks')
      expect(Array.isArray(result.data)).toBe(true)
      expect(result).toHaveProperty('cursor')
    })
  })

  describe('list_workspaces', () => {
    it('returns a paginated response', async () => {
      const result = await client.get<{ data: unknown[]; cursor: { hasMore: boolean } }>('/workspaces')
      expect(Array.isArray(result.data)).toBe(true)
      expect(result).toHaveProperty('cursor')
    })
  })

  describe('list_tags', () => {
    it('returns a plain array (no pagination wrapper)', async () => {
      const result = await client.get<unknown[]>('/tags')
      expect(Array.isArray(result)).toBe(true)
    })

    it('accepts type filter without error', async () => {
      const result = await client.get<unknown[]>('/tags', { type: 'template' })
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('list_drafts (email)', () => {
    it('returns a paginated response', async () => {
      const result = await client.get<{ data: unknown[]; cursor: { hasMore: boolean } }>('/drafts')
      expect(Array.isArray(result.data)).toBe(true)
      expect(result).toHaveProperty('cursor')
    })
  })

  describe('error handling', () => {
    it('throws DyspatchError with correct code on 404', async () => {
      await expect(client.get('/templates/tem_doesnotexist_xxxxxxxxxxx')).rejects.toMatchObject({
        name: 'DyspatchError',
        statusCode: 404,
      })
    })
  })
})
