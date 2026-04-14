const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://mermaidsh.com";

const SKILL = `---
name: mermaid-viewer
description: "Create, version, and share Mermaid diagrams. Use when asked to create flowcharts, sequence diagrams, ER diagrams, or any visual diagram."
---

# mermaid-viewer

Create, version, and share Mermaid diagrams at ${BASE_URL}. Every update creates a new version — nothing is overwritten.

## MCP Server (recommended)

For native tool integration, add to your MCP settings:

\`\`\`json
{
  "mcpServers": {
    "mermaid-viewer": {
      "url": "${BASE_URL}/mcp"
    }
  }
}
\`\`\`

This gives you \`create_diagram\`, \`update_diagram\`, and \`get_diagram\` tools.

## REST API

| Need | Method | Endpoint |
|---|---|---|
| Create a diagram | POST | \`${BASE_URL}/api/d\` |
| Update a diagram | PUT | \`${BASE_URL}/api/d/:id\` |
| Get diagram JSON | GET | \`${BASE_URL}/api/d/:id\` |
| View rendered | GET | \`${BASE_URL}/d/:id\` |

### Create

\`\`\`bash
curl -X POST ${BASE_URL}/api/d \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A-->B", "title": "My Diagram"}'
\`\`\`

Returns \`{ id, url, editUrl, secret, version, skill }\`. **Save the secret** — you need it to push updates.

### Update

\`\`\`bash
curl -X PUT ${BASE_URL}/api/d/:id \\
  -H "Authorization: Bearer <secret>" \\
  -H "Content-Type: text/plain" \\
  -d 'graph TD; A-->B; B-->C'
\`\`\`

### Get

\`\`\`bash
curl ${BASE_URL}/api/d/:id
\`\`\`

Returns \`{ id, title, version, content, versions }\`. Use \`?v=N\` for a specific version.

## Gotchas

- Always save the \`secret\` from the create response — it's the only way to update the diagram.
- Content must be valid Mermaid syntax.
- Each update creates a new version; previous content is never lost.
- The \`skill\` URL in create/update responses points to a per-diagram skill file you can share with other agents.
- Send the diagram URL (\`${BASE_URL}/d/:id\`) to the user so they can view it.
`;

export async function GET() {
  return new Response(SKILL, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
