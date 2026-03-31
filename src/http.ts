import { createServer } from 'node:http'
import type { Server as HttpServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { createMcpServer } from './server.js'

export function createHttpServer(
  serverFactory: () => Server = createMcpServer,
): HttpServer {
  const sessions = new Map<string, StreamableHTTPServerTransport>()

  const httpServer = createServer(async (req, res) => {
    try {
      if (req.url !== '/mcp') {
        res.writeHead(404).end()
        return
      }

      // Read body upfront (needed for POST requests)
      const chunks: Buffer[] = []
      await new Promise<void>((resolve) => {
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', resolve)
      })

      // Fix #1: return 400 on malformed JSON rather than throwing
      let parsed: unknown
      try {
        parsed = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON in request body' }))
        return
      }

      const sessionId = req.headers['mcp-session-id'] as string | undefined

      // New session: POST with an initialize request and no existing session ID
      if (!sessionId && req.method === 'POST' && isInitializeRequest(parsed)) {
        let transport: StreamableHTTPServerTransport
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => { sessions.set(id, transport) },
        })
        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId)
        }
        await serverFactory().connect(transport)
        await transport.handleRequest(req, res, parsed)
        return
      }

      // Route to existing session
      const transport = sessionId ? sessions.get(sessionId) : undefined
      if (!transport) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid or missing session ID' }))
        return
      }

      await transport.handleRequest(req, res, parsed)
    } catch (err) {
      // Fix #3: catch any unhandled rejection in the async handler
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Internal server error' }))
      }
    }
  })

  // Fix #2: handle listen/network errors (e.g. EADDRINUSE, EACCES)
  httpServer.on('error', (err) => {
    console.error('HTTP server error:', err)
    process.exit(1)
  })

  return httpServer
}

// Entry point — only runs when executed directly, not when imported in tests
const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const PORT = Number(process.env.PORT ?? 3000)
  const httpServer = createHttpServer()
  httpServer.listen(PORT, () => {
    console.error(`Dyspatch MCP server (HTTP) listening on http://localhost:${PORT}/mcp`) // stderr keeps stdout clean for stdio mode
  })
}
