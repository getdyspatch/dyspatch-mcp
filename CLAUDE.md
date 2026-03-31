# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build              # compile src/ → dist/ (tsc)
pnpm dev                # run stdio server without compiling (tsx)
pnpm dev:http           # run HTTP server without compiling (tsx)
pnpm start              # run compiled stdio server
pnpm start:http         # run compiled HTTP server
pnpm test               # run unit tests (vitest)
pnpm test:integration   # run integration tests (requires DYSPATCH_API_KEY)
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DYSPATCH_API_KEY` | Yes | — | Dyspatch API bearer token |
| `DYSPATCH_API_VERSION` | No | `2026.01` | API version header value |
| `PORT` | No | `3000` | HTTP listen port (HTTP mode only) |

## Architecture

This MCP server wraps the Dyspatch REST API. It exposes 34 tools across 6 resource groups and supports two transports:

- **stdio** (`src/index.ts`) — default; used by Claude Desktop, Claude Code, MCP inspector
- **HTTP** (`src/http.ts`) — streamable HTTP transport for networked/hosted deployments

### Data flow

```
DYSPATCH_API_KEY env var
  → createClient() → DyspatchClient
  → *Tools(client) → ToolDefinition[]   (one factory per resource file)
  → createMcpServer() → Server          (src/server.ts — shared by both transports)
  → StdioServerTransport  OR  StreamableHTTPServerTransport
```

### HTTP transport

The HTTP server listens on `/mcp`. Primary use case: run the server locally and connect Claude Desktop (or any HTTP-capable MCP client) to `http://localhost:PORT/mcp`.

MCP clients connect by sending an `initialize` POST with no `mcp-session-id` header; subsequent requests include the session ID returned in the response header. Each session gets its own `Server` + `Transport` instance.

```bash
DYSPATCH_API_KEY=your_key PORT=3000 pnpm dev:http
```

### Adding a new tool

1. Create `src/tools/{resource}.ts`
2. Define Zod schemas — every field **must** have `.describe(...)` (this becomes parameter docs in the MCP manifest)
3. Export `function myResourceTools(client: DyspatchClient): ToolDefinition[]`
4. Import and spread into `allTools` in `src/server.ts`

### ESM import requirement

This project uses `"type": "module"` with `moduleResolution: Node16`. All imports **must** use `.js` extensions even for `.ts` source files:

```typescript
import { createClient } from './client.js'   // correct
import { createClient } from './client'      // will fail at runtime
```

### Channel types and `typePath`

Dyspatch has 5 channel types: `email`, `sms`, `push`, `voice`, `liveactivity`. Email uses no URL prefix; all others prepend `/{type}`. Use the `typePath(type)` helper from `client.ts`:

```typescript
const prefix = typePath(type)   // '' | '/sms' | '/push' | '/voice' | '/liveactivity'
client.get(`${prefix}/templates/${id}`)
```

### Email compiled content is base64-encoded

The `subject`, `html`, `ampHtml`, and `text` fields in email template/draft responses are base64-encoded. Decoded values are only returned from the render endpoints.
