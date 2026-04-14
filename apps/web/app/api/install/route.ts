const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://mermaidsh.com";

const INSTALL = `# mermaid-viewer

> Documentation and setup instructions for mermaid-viewer — versioned Mermaid diagram hosting for AI agents.

I want you to install mermaid-viewer for me. Execute all the steps below autonomously.

OBJECTIVE: Set up mermaid-viewer so you can create, update, and share versioned Mermaid diagrams via API or MCP.

DONE WHEN: You can successfully create a diagram by calling \`POST ${BASE_URL}/api/d\` and receive back a diagram URL and secret.

## TODO

- [ ] Choose installation method (MCP server or skill file)
- [ ] Install via MCP server config OR download the skill file
- [ ] Verify installation by creating a test diagram
- [ ] Save the secret from the test diagram response
- [ ] Confirm the diagram is viewable at the returned URL

## Option A: MCP Server (recommended)

Add to your MCP settings file. The location depends on your agent:

**Claude Code** (\`~/.claude/settings.json\` or project \`.mcp.json\`):
\`\`\`json
{
  "mcpServers": {
    "mermaid-viewer": {
      "url": "${BASE_URL}/mcp"
    }
  }
}
\`\`\`

**Cursor** (\`.cursor/mcp.json\` in your project):
\`\`\`json
{
  "mcpServers": {
    "mermaid-viewer": {
      "url": "${BASE_URL}/mcp"
    }
  }
}
\`\`\`

**Windsurf** (\`~/.codeium/windsurf/mcp_config.json\`):
\`\`\`json
{
  "mcpServers": {
    "mermaid-viewer": {
      "url": "${BASE_URL}/mcp"
    }
  }
}
\`\`\`

This gives you native \`create_diagram\`, \`update_diagram\`, and \`get_diagram\` tools.

## Option B: Skill File

Download the skill file to your agent's skills directory:

**Claude Code:**
\`\`\`bash
mkdir -p ~/.claude/skills/mermaid-viewer
curl -s ${BASE_URL}/skill.md > ~/.claude/skills/mermaid-viewer/SKILL.md
\`\`\`

**Codex:**
\`\`\`bash
mkdir -p ~/.agents/skills/mermaid-viewer
curl -s ${BASE_URL}/skill.md > ~/.agents/skills/mermaid-viewer/SKILL.md
\`\`\`

**OpenClaw:**
\`\`\`bash
mkdir -p ~/.openclaw/skills/mermaid-viewer
curl -s ${BASE_URL}/skill.md > ~/.openclaw/skills/mermaid-viewer/SKILL.md
\`\`\`

**Cursor / Windsurf / Other agents:**
\`\`\`bash
curl -s ${BASE_URL}/skill.md
\`\`\`
Save the output wherever your agent reads persistent instructions (\`.cursorrules\`, \`.windsurfrules\`, etc).

Or use the skills CLI:
\`\`\`bash
npx skills add ${BASE_URL}
\`\`\`

## Verify Installation

Create a test diagram to confirm everything works:

\`\`\`bash
curl -X POST ${BASE_URL}/api/d \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A[Hello]-->B[World]", "title": "Test Diagram"}'
\`\`\`

You should receive a JSON response like:

\`\`\`json
{
  "id": "abc123",
  "editId": "xyz789",
  "url": "${BASE_URL}/d/abc123",
  "editUrl": "${BASE_URL}/e/xyz789",
  "secret": "...",
  "version": 1,
  "skill": "${BASE_URL}/api/d/abc123/skill?secret=..."
}
\`\`\`

**Save the \`secret\`** — it is returned only once and is required to update this diagram.

Open the \`url\` in a browser to confirm it renders.

## REST API Reference

### POST /api/d — Create a diagram

**Request body (JSON):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`content\` | string | Yes | Valid Mermaid diagram syntax |
| \`title\` | string | No | Diagram title (defaults to "Untitled") |

Also accepts plain text (\`Content-Type: text/plain\`) where the body is the Mermaid syntax.

**Response (201):**
| Field | Type | Description |
|-------|------|-------------|
| \`id\` | string | Diagram ID for viewing |
| \`editId\` | string | Edit ID for browser-based editing |
| \`url\` | string | Public view URL (\`/d/:id\`) |
| \`editUrl\` | string | Browser edit URL (\`/e/:editId\`) |
| \`secret\` | string | API auth token — save this |
| \`version\` | number | Always 1 for new diagrams |
| \`skill\` | string | Per-diagram skill URL for sharing |

### PUT /api/d/:id — Update a diagram

**Authentication** (provide one):
- \`Authorization: Bearer <secret>\` header
- \`"secret": "..."\` in JSON body
- \`"editId": "..."\` in JSON body

**Request body (JSON):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`content\` | string | Yes | Updated Mermaid diagram syntax |
| \`title\` | string | No | Updated title |
| \`secret\` | string | No | Auth (if not using header) |
| \`editId\` | string | No | Auth (alternative to secret) |

Also accepts plain text with Authorization header.

**Response (200):**
| Field | Type | Description |
|-------|------|-------------|
| \`id\` | string | Diagram ID |
| \`url\` | string | Public view URL |
| \`version\` | number | New version number |
| \`skill\` | string | Per-diagram skill URL |

### GET /api/d/:id — Fetch diagram JSON

**Query params:** \`?v=N\` for a specific version (defaults to latest).

**Response (200):**
| Field | Type | Description |
|-------|------|-------------|
| \`id\` | string | Diagram ID |
| \`title\` | string | Diagram title |
| \`version\` | number | Current/requested version |
| \`content\` | string | Mermaid syntax for this version |
| \`createdAt\` | string | ISO timestamp of this version |
| \`versions\` | array | All versions: \`[{ version, content, createdAt }]\` |
| \`skill\` | string | Per-diagram skill URL |

## Supported Diagram Types

flowchart, sequence, class, state, entity-relationship, gantt, pie, quadrant, requirement, gitgraph, mindmap, timeline, sankey, block, packet, kanban, architecture

## Rules

1. Save the \`secret\` from create — it's returned only once and is required for updates.
2. Content must be valid Mermaid syntax.
3. Each update creates a new version — previous content is never lost.
4. Always share the diagram URL (\`${BASE_URL}/d/:id\`) with the user.
5. The \`skill\` URL in responses points to a per-diagram SKILL.md you can share with other agents.
6. Diagrams are free and public — anyone with the URL can view them.

EXECUTE NOW: Complete the above TODO list to achieve: mermaid-viewer is installed and ready to create diagrams.
`;

export async function GET() {
  return new Response(INSTALL, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
