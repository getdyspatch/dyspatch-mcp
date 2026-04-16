# dyspatch-mcp

MCP server for the [Dyspatch](https://www.dyspatch.io) API — manage email, SMS, push, voice, and live activity templates from any MCP-compatible AI client.

## Prerequisites

- Node.js 20+
- A Dyspatch account and API key — see [Creating an API Key](https://docs.dyspatch.io/administration/creating_api_keys/)

## Setup

The server supports two transports: **stdio** (default, for process-based MCP clients) and **HTTP** (for network-accessible deployments).

### Claude Code (stdio)

```bash
claude mcp add dyspatch -e DYSPATCH_API_KEY=your_key -- npx dyspatch-mcp
```

Restart Claude Code after running this command.

### Claude Desktop — stdio (simplest)

Add to your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dyspatch": {
      "command": "npx",
      "args": ["dyspatch-mcp"],
      "env": {
        "DYSPATCH_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### Claude Desktop — HTTP (run server locally, connect over HTTP)

This is useful when you want the server running persistently in the background, or when you need to connect multiple clients to the same instance.

**Step 1 — Start the server:**

```bash
DYSPATCH_API_KEY=your_key npx dyspatch-mcp --http
```

Or, if installed locally:

```bash
DYSPATCH_API_KEY=your_key PORT=3000 pnpm start:http
```

The server will listen on `http://localhost:3000/mcp`.

**Step 2 — Point Claude Desktop at it:**

```json
{
  "mcpServers": {
    "dyspatch": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Restart Claude Desktop after saving.

### Other MCP clients (stdio)

```
command: npx dyspatch-mcp
env:     DYSPATCH_API_KEY=your_key
```

### Other MCP clients (HTTP)

Start the server as above, then configure your client to connect to `http://localhost:3000/mcp` using the MCP streamable HTTP transport.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `DYSPATCH_API_KEY` | Yes | — | API key from your Dyspatch account settings |
| `PORT` | No | `3000` | HTTP listen port (HTTP transport only) |

## Available Tools

### Templates

| Tool | Description |
|------|-------------|
| `list_templates` | List published templates for a channel type |
| `get_template` | Get a single template including compiled content |
| `render_template` | Render a template with variables (and optional language/theme) |

### Drafts

| Tool | Description |
|------|-------------|
| `list_drafts` | List all drafts for a channel type |
| `get_draft` | Get a draft including compiled content |
| `submit_draft` | Submit a draft for approval |
| `approve_draft` | Approve a draft for publishing |
| `approve_all_localizations` | Approve all localizations of a draft |
| `reject_draft` | Reject a draft submitted for approval |
| `duplicate_draft` | Create a copy of a draft |
| `archive_draft` | Soft-delete a draft |
| `lock_draft_for_translation` | Lock a draft so it can be sent for translation |
| `unlock_draft_for_translation` | Unlock a previously locked draft |
| `get_draft_localization_keys` | Get all translatable string keys defined in a draft |

### Localizations

| Tool | Description |
|------|-------------|
| `list_draft_localizations` | List all localizations attached to a draft |
| `get_localization` | Get a published localization and its compiled content |
| `upsert_localization` | Create or update a localization for a language |
| `delete_localization` | Remove a localization from a draft |
| `set_translations` | Replace all translations for a localization |

### Blocks

| Tool | Description |
|------|-------------|
| `list_blocks` | List reusable content blocks |
| `get_block` | Get a single block |
| `list_block_localizations` | List all localizations for a block |
| `get_block_localization_keys` | Get translatable string keys for a block |
| `upsert_block_localization` | Create or update a localization for a block |
| `delete_block_localization` | Remove a localization from a block |
| `set_block_translations` | Replace all translations for a block localization |

### Workspaces

| Tool | Description |
|------|-------------|
| `list_workspaces` | List top-level workspace folders |
| `get_folder` | Get a folder and its immediate subfolders |

### Tags

| Tool | Description |
|------|-------------|
| `list_tags` | List tags (optionally filtered by type or workspace) |
| `get_tag` | Get a single tag by ID |
| `create_tag` | Create a new tag |
| `update_tag` | Update a tag's name |
| `delete_tag` | Delete a tag |
| `assign_tag` | Assign a tag to a resource |
| `unassign_tag` | Remove a tag from a resource |

## Use Cases

**Audit your template library.** Ask the AI to list all templates across every channel type, summarize what each one does, and flag any with a stale `updatedAt` date.
Tools: `list_templates`, `get_template`

**Preview a template before sending.** Render any published template with real or sample variable data to review the compiled HTML/text output without leaving your AI client.
Tools: `list_templates`, `render_template`

**Manage the approval workflow.** List all drafts, filter to those in `PENDING_APPROVAL` state, review their compiled content, then approve or reject them in bulk — useful for release-day sign-offs.
Tools: `list_drafts`, `get_draft`, `approve_draft`, `reject_draft`

**Set up localization for a new market.** Create localizations for a new language across multiple drafts, seed them with translated strings, and lock the drafts for translation handoff — all in a single conversation.
Tools: `list_drafts`, `upsert_localization`, `set_translations`, `lock_draft_for_translation`

**Organize templates with tags.** Create workspace-scoped tags (e.g. "onboarding", "transactional") and assign them to matching templates to make your template library easier to navigate.
Tools: `create_tag`, `list_templates`, `assign_tag`

**Duplicate a draft and submit it for approval.** Copy an existing draft to use as the starting point for a new variant. Once you've edited the content in Dyspatch, come back to the AI to submit it for approval.
Tools: `duplicate_draft`, `get_draft`, `submit_draft`

## Channel Types

Tools that operate on templates, drafts, or localizations require a `type` parameter:

| Value | Channel |
|---|---|
| `email` | Email |
| `sms` | SMS |
| `push` | Push notification |
| `voice` | Voice |
| `liveactivity` | Live Activity |

## Development

To use the server from this repository in Claude Code, add a `.mcp.json` file at the project root. The server is run directly from source using `tsx` (no build step required).

If `DYSPATCH_API_KEY` is already set in your shell (e.g. via `source .env`), reference it directly:

```json
{
  "mcpServers": {
    "dyspatch": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "env": {
        "DYSPATCH_API_KEY": "${DYSPATCH_API_KEY}"
      }
    }
  }
}
```

Verify the server is registered with `/mcp` in Claude Code.

## Privacy

This MCP server makes authenticated requests to the Dyspatch API (`https://api.dyspatch.io`) using the API key you provide. Request and response payloads are passed through to your AI client and are **not** inspected, stored, or logged by this server.

Dyspatch collects aggregate usage metadata about API calls — endpoint, timestamp, account identifiers — for usage tracking and analytics. Dyspatch does **not** inspect or log the contents of your API request or response bodies. See the [Dyspatch Privacy Policy](https://www.dyspatch.io/privacy-policy/) for full details.

## Notes

**Email compiled content is base64-encoded.** The `subject`, `html`, `ampHtml`, and `text` fields returned by `get_template` and `get_draft` are base64-encoded. Use `render_template` to get decoded output with variables substituted.

**Draft workflow.** Drafts move through states: `IN_PROGRESS` → `PENDING_APPROVAL` → Published. Use `submit_draft` to request approval, `approve_draft` or `reject_draft` to act on the request. Drafts can only be edited while in `IN_PROGRESS`.
