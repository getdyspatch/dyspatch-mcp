/**
 * Unit tests for src/http.ts routing and error-handling logic.
 *
 * These tests cover cases that do NOT require a live MCP session (no real
 * StreamableHTTPServerTransport or DyspatchClient is needed). The initialize
 * → tools/list flow is better covered by a manual smoke test or integration
 * test, since it requires mocking the entire SDK transport layer.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHttpServer } from '../src/http.js'

// ── Minimal HTTP request helper ──────────────────────────────────────────────

interface Response {
  status: number
  headers: http.IncomingHttpHeaders
  body: string
}

function request(
  port: number,
  opts: Omit<http.RequestOptions, 'hostname' | 'port'>,
  body?: string,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, ...opts }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () =>
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString(),
        }),
      )
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('HTTP server routing', () => {
  let server: http.Server
  let port: number

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        server = createHttpServer()
        server.listen(0, '127.0.0.1', () => {
          port = (server.address() as AddressInfo).port
          resolve()
        })
      }),
  )

  afterAll(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  )

  it('returns 404 for non-/mcp paths', async () => {
    const res = await request(port, { path: '/health', method: 'GET' })
    expect(res.status).toBe(404)
  })

  it('returns 404 for root path', async () => {
    const res = await request(port, { path: '/', method: 'GET' })
    expect(res.status).toBe(404)
  })

  it('returns 400 with JSON error for malformed request body', async () => {
    const res = await request(
      port,
      {
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
      },
      'this is not json {{{',
    )
    expect(res.status).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.error).toMatch(/invalid json/i)
  })

  it('returns 400 with JSON error for unknown session ID', async () => {
    const res = await request(port, {
      path: '/mcp',
      method: 'GET',
      headers: {
        Accept: 'application/json, text/event-stream',
        'mcp-session-id': 'nonexistent-session-id',
      },
    })
    expect(res.status).toBe(400)
    const body = JSON.parse(res.body)
    expect(typeof body.error).toBe('string')
  })

  it('returns 400 when no session ID and body is not an initialize request', async () => {
    const res = await request(
      port,
      {
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
      },
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    )
    // Not an initialize request + no session ID → falls through to the missing-session check
    expect(res.status).toBe(400)
  })
})
