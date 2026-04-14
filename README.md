# mermaid-viewer

Versioned Mermaid diagram hosting. Create, update, and share diagrams via API or MCP — with full version history and collaborative editing.

Live at [mermaidsh.com](https://mermaidsh.com).

## How it works

Every diagram gets two URLs:

| URL | Access |
|---|---|
| `/d/{id}` | View only — safe to share publicly |
| `/e/{editId}` | Edit access — can modify the diagram |

Updates create new versions. Nothing is ever overwritten.

## Quick start

### For AI agents

Add the MCP server to your agent's settings:

```json
{
  "mcpServers": {
    "mermaid-viewer": {
      "url": "https://mermaidsh.com/mcp"
    }
  }
}
```

This gives you `create_diagram`, `update_diagram`, and `get_diagram` tools.

Or install the skill file:

```bash
# Claude Code
mkdir -p ~/.claude/skills/mermaid-viewer
curl -s https://mermaidsh.com/skill.md > ~/.claude/skills/mermaid-viewer/SKILL.md

# Codex
mkdir -p ~/.agents/skills/mermaid-viewer
curl -s https://mermaidsh.com/skill.md > ~/.agents/skills/mermaid-viewer/SKILL.md
```

### REST API

**Create a diagram:**

```bash
curl -X POST https://mermaidsh.com/api/d \
  -H "Content-Type: application/json" \
  -d '{"content": "graph TD; A-->B", "title": "My Diagram"}'
```

Returns:

```json
{
  "id": "abc123",
  "editId": "xyz789",
  "url": "https://mermaidsh.com/d/abc123",
  "editUrl": "https://mermaidsh.com/e/xyz789",
  "secret": "...",
  "version": 1
}
```

Save the `secret` — you need it for API updates. The `editUrl` is for browser-based editing.

**Update a diagram:**

```bash
curl -X PUT https://mermaidsh.com/api/d/abc123 \
  -H "Authorization: Bearer <secret>" \
  -H "Content-Type: text/plain" \
  -d 'graph TD; A-->B; B-->C'
```

**Read a diagram:**

```bash
curl https://mermaidsh.com/api/d/abc123
```

## Self-hosting

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL (or a [Neon](https://neon.tech) database)

### Setup

```bash
git clone https://github.com/mrmps/mermaid-viewer.git
cd mermaid-viewer
pnpm install
```

Create `apps/web/.env`:

```
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
```

Push the schema to your database:

```bash
cd packages/db
pnpm run db:push
```

### Development

```bash
pnpm dev
```

Opens at `http://localhost:3000`.

### Deploy

Deploy the `apps/web` directory to any platform that supports Next.js (Vercel, Railway, Fly, etc). Set the `DATABASE_URL` and optionally `NEXT_PUBLIC_BASE_URL` environment variables.

## Architecture

```
apps/web/          Next.js app (pages, API routes, MCP server)
packages/db/       Database schema and queries (Drizzle ORM + Neon)
```

- **Database**: Two tables — `diagrams` (metadata + edit credentials) and `versions` (immutable content history)
- **Auth**: No user accounts. Each diagram has a `secret` for API auth and an `editId` for browser edit links
- **MCP**: Streamable HTTP server at `/mcp` with create/update/get tools
- **Rendering**: Client-side Mermaid.js with theme support
