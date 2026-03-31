import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { createMcpServer } from './server.js'

const PORT = Number(process.env.PORT ?? 3000)

const sessions = new Map<string, StreamableHTTPServerTransport>()

const httpServer = createServer(async (req, res) => {
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
  const parsed = chunks.length
    ? JSON.parse(Buffer.concat(chunks).toString())
    : undefined

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
    await createMcpServer().connect(transport)
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
})

httpServer.listen(PORT, () => {
  console.error(`Dyspatch MCP server (HTTP) listening on http://localhost:${PORT}/mcp`)
})
