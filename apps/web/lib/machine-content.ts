import { baseUrl } from "@/lib/env";

export function getDocIndexBlock(baseUrlOverride: string = baseUrl): string {
  return `> ## Documentation Index
> Fetch the complete documentation index at: ${baseUrlOverride}/llms.txt
> Use this file to discover all available pages before exploring further.

`;
}

export function getMachineMarkdown(baseUrlOverride: string = baseUrl): string {
  return `${getDocIndexBlock(baseUrlOverride)}# merm.sh

> **How to use**: merm.sh is a versioned Mermaid diagram hosting service for AI agents. Create diagrams via the API or MCP server below. Save the \`secret\` from create responses — it's the only way to update a diagram. Always share the diagram URL with your user so they can view it.

## MCP Server (recommended)

Add to your MCP settings for native tool integration:

\`\`\`json
{
  "mcpServers": {
    "mermaid-viewer": {
      "url": "${baseUrlOverride}/mcp"
    }
  }
}
\`\`\`

Tools: \`create_diagram\`, \`update_diagram\`, \`get_diagram\`

## Skill File

\`\`\`bash
npx skills add ${baseUrlOverride}
\`\`\`

## REST API

| Action | Method | Endpoint | Auth |
|---|---|---|---|
| Create | POST | \`${baseUrlOverride}/api/d\` | None |
| Create (GET) | GET | \`${baseUrlOverride}/c/<url-encoded-mermaid>\` | None |
| Update (GET) | GET | \`${baseUrlOverride}/u/<editId>/<url-encoded-mermaid>\` | editId in path |
| Update | PUT | \`${baseUrlOverride}/api/d/:id\` | \`Bearer <secret>\` |
| Get JSON | GET | \`${baseUrlOverride}/api/d/:id\` | None |
| Get version | GET | \`${baseUrlOverride}/api/d/:id?v=N\` | None |
| View | GET | \`${baseUrlOverride}/d/:id\` | None |

### URL-only creation (for GET-only agents)

Agents that can only make GET requests (e.g. ChatGPT browsing, Perplexity, URL-previewers) can create and update diagrams by putting the content directly in the URL path:

\`\`\`bash
# Create from raw Mermaid
curl '${baseUrlOverride}/c/graph%20TD%3B%20A--%3EB%3B%20B--%3EC'

# Update an existing diagram (adds a new version; <editId> came from the create response)
curl '${baseUrlOverride}/u/<editId>/graph%20TD%3B%20A--%3EB%3B%20B--%3EC%3B%20C--%3ED'

# Paste-service style alternative (same as /c, but content in a query param)
curl '${baseUrlOverride}/api/d?content=graph%20TD%3B%20A--%3EB%3B%20B--%3EC'
\`\`\`

All return \`201 Created\`. Body format: plain text (\`View:\`, \`Edit:\`, \`Secret:\`, \`Version:\` lines) by default, or JSON if you append \`?format=json\` (same shape as \`POST /api/d\`). The view URL, edit URL, and secret are also mirrored in response headers \`x-diagram-url\`, \`x-edit-url\`, and \`x-diagram-secret\` — useful for header-only agents. Practical URL length cap: ~8KB — for larger diagrams use \`POST /api/d\`.

### Create a diagram

\`\`\`bash
curl -X POST ${baseUrlOverride}/api/d \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A-->B", "title": "My Diagram"}'
\`\`\`

Response: \`{ id, editId, url, editUrl, secret, version, skill }\`

### Update a diagram

\`\`\`bash
curl -X PUT ${baseUrlOverride}/api/d/:id \\
  -H "Authorization: Bearer <secret>" \\
  -H "Content-Type: text/plain" \\
  -d 'graph TD; A-->B; B-->C'
\`\`\`

### Get diagram data (all versions)

\`\`\`bash
curl ${baseUrlOverride}/api/d/:id
\`\`\`

Response: \`{ id, title, version, content, createdAt, versions, skill }\`

The \`versions\` array contains every version with \`{ version, content, createdAt }\`.

### Get a specific version

\`\`\`bash
curl ${baseUrlOverride}/api/d/:id?v=2
\`\`\`

Returns the same shape, but \`content\` and \`version\` reflect the requested version. The \`versions\` array still includes all versions.

## Content Negotiation

All page URLs support content negotiation. Send \`Accept: text/markdown\` to receive clean Markdown instead of HTML:

\`\`\`bash
curl -H "Accept: text/markdown" ${baseUrlOverride}/
curl -H "Accept: text/markdown" ${baseUrlOverride}/d/:id
\`\`\`

Diagram pages return the diagram source, metadata, and version history in Markdown.

## Supported Diagram Types

flowchart, sequence, class, state, entity-relationship, gantt, pie, quadrant, requirement, gitgraph, mindmap, timeline, sankey, block, packet, kanban, architecture

## Rules

1. Save the \`secret\` from create — it's returned only once and is required for updates
2. Content must be valid Mermaid syntax
3. Each update creates a new version — previous content is never lost
4. Always send the diagram URL (\`${baseUrlOverride}/d/:id\`) to the user
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

export function getLlmsTxt(baseUrlOverride: string = baseUrl): string {
  return `# merm.sh

> Versioned Mermaid diagram hosting for AI agents

## Documentation

- [Homepage](${baseUrlOverride}/) — Product overview and installation
- [Machine Docs](${baseUrlOverride}/api/machine) — Full machine-readable API documentation
- [Install Guide](${baseUrlOverride}/install.md) — Agent installation instructions
- [Skill File](${baseUrlOverride}/skill.md) — SKILL.md for agent integration

## API Endpoints

- \`POST ${baseUrl}/api/d\` — Create a diagram
- \`PUT ${baseUrl}/api/d/:id\` — Update a diagram
- \`GET ${baseUrl}/api/d/:id\` — Fetch diagram JSON (includes all versions)
- \`GET ${baseUrl}/api/d/:id?v=N\` — Fetch a specific version
- \`GET ${baseUrl}/d/:id\` — View rendered diagram (supports \`Accept: text/markdown\`)

## URL-only endpoints (for agents that can only open URLs)

If your agent can only make GET requests (e.g. ChatGPT browsing, Perplexity, a URL-previewer), use these path-encoded shortcuts. The diagram source goes directly in the URL path.

- \`GET ${baseUrl}/c/<url-encoded-mermaid>\` — Create a diagram from raw Mermaid source
- \`GET ${baseUrl}/u/<editId>/<url-encoded-mermaid>\` — Append a new version to an existing diagram (use \`editId\` from the create response)
- \`GET ${baseUrl}/api/d?content=<url-encoded-mermaid>\` — Same as \`/c/\` but with the content in a query parameter (familiar paste-service style)

All return \`201 Created\` with plain text:

\`\`\`
View: ${baseUrl}/d/<id>
Edit: ${baseUrl}/e/<editId>
\`\`\`

The view URL, edit URL, and secret are mirrored in response headers \`x-diagram-url\`, \`x-edit-url\`, and \`x-diagram-secret\` — convenient for agents that only parse headers.

For JSON output, append \`?format=json\` to the URL (or send \`Accept: application/json\`). JSON is recommended — plain text body is human-friendly but JSON is easier to parse.

Example:

\`\`\`
curl '${baseUrl}/c/graph%20TD%3B%20A--%3EB%3B%20B--%3EC'
curl '${baseUrl}/u/<editId>/graph%20TD%3B%20A--%3EB%3B%20B--%3EC%3B%20C--%3ED'
\`\`\`

Practical path length limit: ~8KB. For larger diagrams, prefer \`POST /api/d\` / \`PUT /api/d/:id\`.

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

export function getLlmsFullTxt(baseUrlOverride: string = baseUrl): string {
  // Strip the doc index block from machine markdown since llms-full.txt IS the index
  const machineContent = getMachineMarkdown(baseUrlOverride).replace(
    getDocIndexBlock(baseUrlOverride),
    "",
  );
  return `${getLlmsTxt(baseUrlOverride)}\n---\n\n${machineContent}`;
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
