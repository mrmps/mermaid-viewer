import { baseUrl } from "@/lib/env";

const SKILL = `---
name: mermaid-viewer
description: "Create, version, and share Mermaid diagrams. Use when asked to create flowcharts, sequence diagrams, ER diagrams, or any visual diagram."
---

# merm.sh

Create, version, and share Mermaid diagrams at ${baseUrl}. Boards are the primary workspace; a single diagram is represented as a one-card board. Every update creates a new version — nothing is overwritten.

## MCP Server (recommended)

For native tool integration, add to your MCP settings:

\`\`\`json
{
  "mcpServers": {
    "mermaid-viewer": {
      "type": "http",
      "url": "${baseUrl}/mcp"
    }
  }
}
\`\`\`

This gives you \`create_diagram\`, \`update_diagram\`, \`get_diagram\`, \`create_board\`, \`add_diagram_to_board\`, and \`get_board\` tools.

When a user asks for several related diagrams, create a board first. Pass the returned \`boardId\` and \`boardSecret\` into \`create_diagram\`, or call \`add_diagram_to_board\` after creating each diagram. Send the board URL so the user can see the full workspace.

## REST API

| Need | Method | Endpoint |
|---|---|---|
| Create a diagram | POST | \`${baseUrl}/api/d\` |
| Update a diagram | PUT | \`${baseUrl}/api/d/:id\` |
| Get diagram JSON | GET | \`${baseUrl}/api/d/:id\` |
| Create a board | POST | \`${baseUrl}/api/b\` |
| Get board JSON | GET | \`${baseUrl}/api/b/:id\` |
| Add/create board card | POST | \`${baseUrl}/api/b/:id\` |
| View rendered | GET | \`${baseUrl}/d/:id\` |

### Create

\`\`\`bash
curl -X POST ${baseUrl}/api/d \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A-->B", "title": "My Diagram"}'
\`\`\`

Returns \`{ id, url, editUrl, diagramUrl, boardUrl, secret, version, skill }\`. Share \`url\`; it points at the board when one is available. **Save the secret** — you need it to push updates.

### Create directly on a board

\`\`\`bash
curl -X POST ${baseUrl}/api/b/:id \\
  -H "Content-Type: application/json" \\
  -d '{"editId": "BOARD_EDIT_ID", "title": "My Diagram", "content": "graph TD; A-->B"}'
\`\`\`

You can also pass \`diagramId\` instead of \`content\` to add an existing diagram. Cards are placed in the nearest open slot by default.

### Update

\`\`\`bash
curl -X PUT ${baseUrl}/api/d/:id \\
  -H "Authorization: Bearer <secret>" \\
  -H "Content-Type: text/plain" \\
  -d 'graph TD; A-->B; B-->C'
\`\`\`

### Get

\`\`\`bash
curl ${baseUrl}/api/d/:id
\`\`\`

Returns \`{ id, title, version, content, versions }\`. Use \`?v=N\` for a specific version.

## Gotchas

- Always save the \`secret\` from the create response — it's the only way to update the diagram.
- Content must be valid Mermaid syntax.
- Each update creates a new version; previous content is never lost.
- The \`skill\` URL in create/update responses points to a per-diagram skill file you can share with other agents.
- Send the \`url\` field to the user. It is the board URL when a board is available.
- For related diagrams, create or add cards on the same board and send the board URL (\`${baseUrl}/b/:id\`).
`;

export async function GET() {
  return new Response(SKILL, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
