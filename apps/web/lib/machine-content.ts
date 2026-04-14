const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://mermaidsh.com";

export function getMachineMarkdown(baseUrl: string = BASE_URL): string {
  return `# mermaid-viewer

> **How to use**: mermaid-viewer is a versioned Mermaid diagram hosting service for AI agents. Create diagrams via the API or MCP server below. Save the \`secret\` from create responses — it's the only way to update a diagram. Always share the diagram URL with your user so they can view it.

## MCP Server (recommended)

Add to your MCP settings for native tool integration:

\`\`\`json
{
  "mcpServers": {
    "mermaid-viewer": {
      "url": "${baseUrl}/mcp"
    }
  }
}
\`\`\`

Tools: \`create_diagram\`, \`update_diagram\`, \`get_diagram\`

## Skill File

\`\`\`bash
npx skills add ${baseUrl}
\`\`\`

## REST API

| Action | Method | Endpoint | Auth |
|---|---|---|---|
| Create | POST | \`${baseUrl}/api/d\` | None |
| Update | PUT | \`${baseUrl}/api/d/:id\` | \`Bearer <secret>\` |
| Get JSON | GET | \`${baseUrl}/api/d/:id\` | None |
| View | GET | \`${baseUrl}/d/:id\` | None |

### Create a diagram

\`\`\`bash
curl -X POST ${baseUrl}/api/d \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A-->B", "title": "My Diagram"}'
\`\`\`

Response: \`{ id, url, editUrl, secret, version, skill }\`

### Update a diagram

\`\`\`bash
curl -X PUT ${baseUrl}/api/d/:id \\
  -H "Authorization: Bearer <secret>" \\
  -H "Content-Type: text/plain" \\
  -d 'graph TD; A-->B; B-->C'
\`\`\`

### Get diagram data

\`\`\`bash
curl ${baseUrl}/api/d/:id
\`\`\`

Response: \`{ id, title, version, content, versions, skill }\`

Append \`?v=N\` for a specific version.

## Supported Diagram Types

flowchart, sequence, class, state, entity-relationship, gantt, pie, quadrant, requirement, gitgraph, mindmap, timeline, sankey, block, packet, kanban, architecture

## Rules

1. Save the \`secret\` from create — it's returned only once and is required for updates
2. Content must be valid Mermaid syntax
3. Each update creates a new version — previous content is never lost
4. Always send the diagram URL (\`${baseUrl}/d/:id\`) to the user
5. The \`skill\` URL in create/update responses points to a per-diagram SKILL.md you can share with other agents
6. Diagrams are free and public — anyone with the URL can view them
`;
}
