# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build    # compile src/ → dist/ (tsc)
pnpm dev      # run without compiling (tsx)
pnpm start    # run compiled output
```

No test runner is configured. Verify correctness by running `pnpm dev` or `pnpm build`.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DYSPATCH_API_KEY` | Yes | — | Dyspatch API bearer token |
| `DYSPATCH_API_VERSION` | No | `2026.01` | API version header value |

## Architecture

This is an **MCP server** (stdio transport) that wraps the Dyspatch REST API. It exposes 25 tools across 6 resource groups.

### Data flow

```
DYSPATCH_API_KEY env var
  → createClient() → DyspatchClient
  → *Tools(client) → ToolDefinition[]   (one factory per resource file)
  → allTools flat array + toolMap (O(1) lookup)
  → MCP Server (ListTools / CallTool handlers)
  → StdioServerTransport
```

### Adding a new tool

1. Create `src/tools/{resource}.ts`
2. Define Zod schemas — every field **must** have `.describe(...)` (this becomes parameter docs in the MCP manifest)
3. Export `function myResourceTools(client: DyspatchClient): ToolDefinition[]`
4. Import and spread into `allTools` in `src/index.ts`

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
