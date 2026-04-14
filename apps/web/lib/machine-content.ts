const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://mermaidsh.com";

export function getDocIndexBlock(baseUrl: string = BASE_URL): string {
  return `> ## Documentation Index
> Fetch the complete documentation index at: ${baseUrl}/llms.txt
> Use this file to discover all available pages before exploring further.

`;
}

export function getMachineMarkdown(baseUrl: string = BASE_URL): string {
  return `${getDocIndexBlock(baseUrl)}# mermaid-viewer

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
| Get version | GET | \`${baseUrl}/api/d/:id?v=N\` | None |
| View | GET | \`${baseUrl}/d/:id\` | None |

### Create a diagram

\`\`\`bash
curl -X POST ${baseUrl}/api/d \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A-->B", "title": "My Diagram"}'
\`\`\`

Response: \`{ id, editId, url, editUrl, secret, version, skill }\`

### Update a diagram

\`\`\`bash
curl -X PUT ${baseUrl}/api/d/:id \\
  -H "Authorization: Bearer <secret>" \\
  -H "Content-Type: text/plain" \\
  -d 'graph TD; A-->B; B-->C'
\`\`\`

### Get diagram data (all versions)

\`\`\`bash
curl ${baseUrl}/api/d/:id
\`\`\`

Response: \`{ id, title, version, content, createdAt, versions, skill }\`

The \`versions\` array contains every version with \`{ version, content, createdAt }\`.

### Get a specific version

\`\`\`bash
curl ${baseUrl}/api/d/:id?v=2
\`\`\`

Returns the same shape, but \`content\` and \`version\` reflect the requested version. The \`versions\` array still includes all versions.

## Content Negotiation

All page URLs support content negotiation. Send \`Accept: text/markdown\` to receive clean Markdown instead of HTML:

\`\`\`bash
curl -H "Accept: text/markdown" ${baseUrl}/
curl -H "Accept: text/markdown" ${baseUrl}/d/:id
\`\`\`

Diagram pages return the diagram source, metadata, and version history in Markdown.

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

export function getDiagramMarkdown(
  baseUrl: string,
  diagram: { id: string; title: string; createdAt: string },
  currentVersion: { version: number; content: string; createdAt: string },
  allVersions: { version: number; createdAt: string }[],
): string {
  const versionRows = allVersions
    .map((v) => `| v${v.version} | ${v.createdAt} |`)
    .join("\n");

  return `${getDocIndexBlock(baseUrl)}# ${diagram.title}

- **ID**: \`${diagram.id}\`
- **Version**: ${currentVersion.version} of ${allVersions.length}
- **Created**: ${diagram.createdAt}
- **View**: [${baseUrl}/d/${diagram.id}](${baseUrl}/d/${diagram.id})

## Diagram Source (v${currentVersion.version})

\`\`\`mermaid
${currentVersion.content}
\`\`\`

## Version History

| Version | Created |
|---|---|
${versionRows}

## API

- Fetch this diagram as JSON: \`GET ${baseUrl}/api/d/${diagram.id}\`
- Fetch a specific version: \`GET ${baseUrl}/api/d/${diagram.id}?v=N\`
- Full documentation: [${baseUrl}/llms.txt](${baseUrl}/llms.txt)
`;
}

export function getLlmsTxt(baseUrl: string = BASE_URL): string {
  return `# mermaid-viewer

> Versioned Mermaid diagram hosting for AI agents

## Documentation

- [Homepage](${baseUrl}/) — Product overview and installation
- [Machine Docs](${baseUrl}/api/machine) — Full machine-readable API documentation
- [Install Guide](${baseUrl}/install.md) — Agent installation instructions
- [Skill File](${baseUrl}/skill.md) — SKILL.md for agent integration

## API Endpoints

- \`POST ${baseUrl}/api/d\` — Create a diagram
- \`PUT ${baseUrl}/api/d/:id\` — Update a diagram
- \`GET ${baseUrl}/api/d/:id\` — Fetch diagram JSON (includes all versions)
- \`GET ${baseUrl}/api/d/:id?v=N\` — Fetch a specific version
- \`GET ${baseUrl}/d/:id\` — View rendered diagram (supports \`Accept: text/markdown\`)

## Content Negotiation

All page URLs support content negotiation. Send \`Accept: text/markdown\` to receive clean Markdown instead of HTML. Diagram pages return the diagram source, metadata, and version history in Markdown.

## MCP Server

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
`;
}

export function getLlmsFullTxt(baseUrl: string = BASE_URL): string {
  // Strip the doc index block from machine markdown since llms-full.txt IS the index
  const machineContent = getMachineMarkdown(baseUrl).replace(
    getDocIndexBlock(baseUrl),
    "",
  );
  return `${getLlmsTxt(baseUrl)}\n---\n\n${machineContent}`;
}

export const LLMS_HEADERS = {
  Link: '</llms.txt>; rel="llms-txt", </llms-full.txt>; rel="llms-full-txt"',
  "X-Llms-Txt": "/llms.txt",
};

export const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  "X-Robots-Tag": "noindex, nofollow",
  ...LLMS_HEADERS,
};
