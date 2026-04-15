import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { mswServer } from './setup.js'
import { DyspatchClient, DyspatchError } from '../src/client.js'

const API_KEY = 'test-api-key'
const BASE = 'https://api.dyspatch.io'

function makeClient() {
  return new DyspatchClient(API_KEY)
}

describe('DyspatchClient', () => {
  describe('request headers', () => {
    it('sends Bearer auth header', async () => {
      let capturedAuth: string | null = null
      mswServer.use(
        http.get(`${BASE}/test`, ({ request }) => {
          capturedAuth = request.headers.get('authorization')
          return HttpResponse.json({})
        }),
      )
      await makeClient().get('/test')
      expect(capturedAuth).toBe(`Bearer ${API_KEY}`)
    })

    it('sends Accept header with pinned API version', async () => {
      let capturedAccept: string | null = null
      mswServer.use(
        http.get(`${BASE}/test`, ({ request }) => {
          capturedAccept = request.headers.get('accept')
          return HttpResponse.json({})
        }),
      )
      await makeClient().get('/test')
      expect(capturedAccept).toBe('application/vnd.dyspatch.2026.01+json')
    })
  })

  describe('HTTP methods', () => {
    beforeEach(() => {
      mswServer.use(
        http.get(`${BASE}/resource`, () => HttpResponse.json({ method: 'get' })),
        http.post(`${BASE}/resource`, () => HttpResponse.json({ method: 'post' })),
        http.put(`${BASE}/resource`, () => HttpResponse.json({ method: 'put' })),
        http.patch(`${BASE}/resource`, () => HttpResponse.json({ method: 'patch' })),
        http.delete(`${BASE}/resource`, () => new HttpResponse(null, { status: 204 })),
      )
    })

    it('GET returns parsed JSON', async () => {
      const result = await makeClient().get('/resource')
      expect(result).toEqual({ method: 'get' })
    })

    it('POST sends body and returns parsed JSON', async () => {
      let capturedBody: unknown
      mswServer.use(
        http.post(`${BASE}/resource`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ method: 'post' })
        }),
      )
      await makeClient().post('/resource', { foo: 'bar' })
      expect(capturedBody).toEqual({ foo: 'bar' })
    })

    it('PUT sends body', async () => {
      let capturedBody: unknown
      mswServer.use(
        http.put(`${BASE}/resource`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({})
        }),
      )
      await makeClient().put('/resource', { key: 'value' })
      expect(capturedBody).toEqual({ key: 'value' })
    })

    it('DELETE returns undefined on 204', async () => {
      const result = await makeClient().delete('/resource')
      expect(result).toBeUndefined()
    })
  })

  describe('query string building', () => {
    it('appends defined query params', async () => {
      let capturedUrl: string | null = null
      mswServer.use(
        http.get(`${BASE}/items`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({})
        }),
      )
      await makeClient().get('/items', { cursor: 'abc123', type: 'email' })
      const url = new URL(capturedUrl!)
      expect(url.searchParams.get('cursor')).toBe('abc123')
      expect(url.searchParams.get('type')).toBe('email')
    })

    it('omits undefined query params', async () => {
      let capturedUrl: string | null = null
      mswServer.use(
        http.get(`${BASE}/items`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({})
        }),
      )
      await makeClient().get('/items', { cursor: undefined, type: 'email' })
      const url = new URL(capturedUrl!)
      expect(url.searchParams.has('cursor')).toBe(false)
      expect(url.searchParams.get('type')).toBe('email')
    })

    it('produces no query string when all params are undefined', async () => {
      let capturedUrl: string | null = null
      mswServer.use(
        http.get(`${BASE}/items`, ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({})
        }),
      )
      await makeClient().get('/items', { cursor: undefined })
      expect(capturedUrl).toBe(`${BASE}/items`)
    })
  })

  describe('error handling', () => {
    it('throws DyspatchError with parsed fields', async () => {
      mswServer.use(
        http.get(`${BASE}/bad`, () =>
          HttpResponse.json(
            { code: 'not_found', message: 'Resource not found', parameter: 'id' },
            { status: 404 },
          ),
        ),
      )
      await expect(makeClient().get('/bad')).rejects.toMatchObject({
        name: 'DyspatchError',
        code: 'not_found',
        message: 'not_found: Resource not found',
        parameter: 'id',
        statusCode: 404,
      })
    })

    it('falls back to server_error when error body is not JSON', async () => {
      mswServer.use(
        http.get(`${BASE}/broken`, () =>
          new HttpResponse('Internal Server Error', { status: 500 }),
        ),
      )
      await expect(makeClient().get('/broken')).rejects.toMatchObject({
        name: 'DyspatchError',
        code: 'server_error',
        statusCode: 500,
      })
    })

    it('throws DyspatchError on 401', async () => {
      mswServer.use(
        http.get(`${BASE}/private`, () =>
          HttpResponse.json({ code: 'unauthenticated', message: 'Invalid API key' }, { status: 401 }),
        ),
      )
      await expect(makeClient().get('/private')).rejects.toMatchObject({
        code: 'unauthenticated',
        statusCode: 401,
      })
    })

    it('error instanceof DyspatchError', async () => {
      mswServer.use(
        http.get(`${BASE}/err`, () =>
          HttpResponse.json({ code: 'server_error', message: 'oops' }, { status: 500 }),
        ),
      )
      await expect(makeClient().get('/err')).rejects.toBeInstanceOf(DyspatchError)
    })
  })
})
