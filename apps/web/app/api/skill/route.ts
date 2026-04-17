import { baseUrl } from "@/lib/env";

const SKILL = `---
name: mermaid-viewer
description: "Create, version, and share Mermaid diagrams. Use when asked to create flowcharts, sequence diagrams, ER diagrams, or any visual diagram."
---

# merm.sh

Create, version, and share Mermaid diagrams at ${baseUrl}. Every update creates a new version — nothing is overwritten.

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

This gives you \`create_diagram\`, \`update_diagram\`, and \`get_diagram\` tools.

## REST API

| Need | Method | Endpoint |
|---|---|---|
| Create a diagram | POST | \`${baseUrl}/api/d\` |
| Update a diagram | PUT | \`${baseUrl}/api/d/:id\` |
| Get diagram JSON | GET | \`${baseUrl}/api/d/:id\` |
| View rendered | GET | \`${baseUrl}/d/:id\` |

### Create

\`\`\`bash
curl -X POST ${baseUrl}/api/d \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A-->B", "title": "My Diagram"}'
\`\`\`

Returns \`{ id, url, editUrl, secret, version, skill }\`. **Save the secret** — you need it to push updates.

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
- Send the diagram URL (\`${baseUrl}/d/:id\`) to the user so they can view it.
`;

export async function GET() {
  return new Response(SKILL, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
