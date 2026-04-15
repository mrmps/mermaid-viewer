import { baseUrl } from "@/lib/env";

export function getDocIndexBlock(baseUrlOverride: string = baseUrl): string {
  return `> ## Documentation Index
> Fetch the complete documentation index at: ${baseUrlOverride}/llms.txt
> Use this file to discover all available pages before exploring further.

`;
}

export function getMachineMarkdown(baseUrlOverride: string = baseUrl): string {
  return `${getDocIndexBlock(baseUrlOverride)}# merm.sh

> **merm.sh** hosts versioned Mermaid diagrams. You create one with a single GET or POST, get back a stable rendered-page URL, and share that URL with the user. Every update creates a new version; nothing is overwritten.

## Two URL shapes, one job each

- \`${baseUrlOverride}/d/<id>\` — **share URL.** Rendered diagram page; give this to the user.
- \`${baseUrlOverride}/c/<url-encoded-mermaid>\` or \`POST ${baseUrlOverride}/api/d\` — **create.** Returns the share URL plus credentials.
- \`${baseUrlOverride}/u/<editId>/<url-encoded-mermaid>\` or \`PUT ${baseUrlOverride}/api/d/<id>\` — **update.** Adds a version to an existing diagram.

The create and update paths are *endpoints*, not share URLs. After calling them, read the response and use the \`url\` field (or the \`Share URL\` line in plain text) as the user-facing link.

## Recommended agent flow

1. Create: \`GET ${baseUrlOverride}/c/<url-encoded-mermaid>?format=json\` (or POST).
2. Read the response: \`{ url, editId, secret, version, … }\`.
3. Give the user the \`url\` (e.g. \`${baseUrlOverride}/d/abc123\`).
4. Keep \`editId\` (URL-only updates) and/or \`secret\` (REST updates) for the session.
5. To add a version later, call the update endpoint with the new Mermaid.


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

> Versioned Mermaid diagram hosting. Create and update diagrams with a single GET request; share the rendered result with a stable URL.

## How merm.sh works

Three URL shapes, each with one job:

| Path | Purpose |
|---|---|
| \`${baseUrlOverride}/d/<id>\` | **Share URL.** Rendered diagram page. This is what you give to humans. |
| \`${baseUrlOverride}/c/<url-encoded-mermaid>\` | **Create endpoint.** Each call creates a new diagram and returns its share URL. |
| \`${baseUrlOverride}/u/<editId>/<url-encoded-mermaid>\` | **Update endpoint.** Adds a new version to the diagram identified by \`editId\`. |

Every update creates a new version. Nothing is overwritten; old versions stay available at \`/api/d/<id>?v=N\`.

## The flow, for agents

\`\`\`
1. Fetch   GET ${baseUrlOverride}/c/<url-encoded-mermaid>?format=json
2. Read    { "url": "${baseUrlOverride}/d/abc123",
             "editId": "…", "secret": "…", "version": 1 }
3. Return  "${baseUrlOverride}/d/abc123" to the user
4. Save    editId (for URL-only updates) and/or secret (for REST updates)
\`\`\`

The important habit: after step 1, read the response and extract \`url\`. Do not pass the \`/c/\` URL back to the user — it's a write endpoint, not a share link.

## FOR AGENTS: how to return a diagram URL to your user

When you fetch \`/c/<mermaid>\` or \`/u/<editId>/<mermaid>\`, the response contains the shareable URL — you must return that URL (\`${baseUrlOverride}/d/<id>\`) to the user, NOT the \`/c/\` or \`/u/\` URL you just called. The \`/c/\` and \`/u/\` URLs are **endpoints that create a new diagram every time they're hit**. Only \`/d/<id>\` is a stable share link.

Workflow:

1. \`GET ${baseUrlOverride}/c/<url-encoded-mermaid>?format=json\`
2. Read the \`url\` field from the JSON response (or the \`Share URL:\` line in plain text).
3. Return that \`/d/<id>\` URL to the user.

If you skip step 2 and just return the URL you called, the user will never see a stable rendered diagram.

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
