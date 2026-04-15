import { baseUrl } from "@/lib/env";

/**
 * Kept for backwards compatibility with internal callers, but the machine
 * markdown no longer prepends it. Historically this block told agents to
 * go fetch /llms.txt before doing anything; we now serve the full spec
 * inline at the root, so the redirection isn't helpful any more.
 */
export function getDocIndexBlock(baseUrlOverride: string = baseUrl): string {
  return `> ## Documentation Index
> Fetch the complete documentation index at: ${baseUrlOverride}/llms.txt
> Use this file to discover all available pages before exploring further.

`;
}

/**
 * The full spec, served at `/` (content-negotiated to non-HTML clients) and
 * at `/api/machine`. Everything an agent needs to successfully create,
 * read, and update a diagram lives on this page — no follow-on fetches.
 */
export function getMachineMarkdown(baseUrlOverride: string = baseUrl): string {
  return `# merm.sh — complete spec

> **This page is everything you need.** You do not need to fetch other docs. merm.sh hosts versioned Mermaid diagrams: one GET or POST creates a diagram, you get back a stable rendered-page URL, and that URL is what you hand to the user.

---

## If you only read one section

Pick whichever shape your environment supports. **All three create a diagram in one call** and return the same response. \`?format=json\` is optional but recommended.

\`\`\`bash
# Option A — sandboxed-browse agents (ChatGPT, Claude.ai web).
# Just add ?content= to the homepage URL. Works when your fetch tool
# only allows the exact domain the user mentioned and rejects
# "dynamic" sub-paths.
curl '${baseUrlOverride}/?content=graph%20TD%3B%20A--%3EB&format=json'

# Option B — agents that can fetch arbitrary paths on the domain.
curl '${baseUrlOverride}/c/graph%20TD%3B%20A--%3EB?format=json'

# Option C — anyone that can POST.
curl -X POST '${baseUrlOverride}/api/d' \\
  -H 'Content-Type: text/plain' \\
  -d 'graph TD; A-->B'
\`\`\`

You get back (JSON):

\`\`\`json
{
  "id": "abc123",
  "editId": "xyz789",
  "url":     "${baseUrlOverride}/d/abc123",
  "editUrl": "${baseUrlOverride}/e/xyz789",
  "secret":  "s3cr3t…",
  "version": 1,
  "instructions": { "share_with_user": "${baseUrlOverride}/d/abc123", ... }
}
\`\`\`

Then you tell the user: *"Your diagram is at ${baseUrlOverride}/d/abc123"*. The URL you *called* (\`/?content=…\`, \`/c/…\`, or \`POST /api/d\`) is the **write endpoint**, not a share link. The \`url\` field in the response is the output — a stable rendered-diagram page at \`/d/<id>\`. That is the one humans open.

### Which shape should I use?

- **Sandboxed in a browse tool** (ChatGPT browse, Claude.ai web, Perplexity): use **Option A** — \`${baseUrlOverride}/?content=…\`. It only needs permission for the exact domain the user named. No path heuristic to trip on.
- **Have full HTTP access** (Claude Code, Codex, your own backend, curl in a real terminal): use **Option C** (POST) for diagrams over ~5KB, otherwise any of A/B/C works. POST avoids URL length caps and is what the CLI uses.
- **Have GET-only access but can fetch any path**: use **Option B** — \`/c/<mermaid>\` is slightly more idiomatic.

---

## Three URL shapes, three jobs

| Shape | Job | Who uses it |
|---|---|---|
| \`${baseUrlOverride}/d/<id>\` | **Share URL.** Rendered diagram page. | Humans, in a browser. |
| \`${baseUrlOverride}/c/<url-encoded-mermaid>\` | **Create.** Each call makes a new diagram. | Agents, one GET. |
| \`${baseUrlOverride}/u/<editId>/<url-encoded-mermaid>\` | **Update.** Adds a version to an existing diagram. | Agents, one GET. |

Nothing is overwritten. Every update creates a new version. Prior versions stay at \`${baseUrlOverride}/api/d/<id>?v=N\`.

---

## All endpoints

| Action | Method | Endpoint | Auth |
|---|---|---|---|
| Create (homepage shortcut) | GET | \`${baseUrlOverride}/?content=<url-encoded-mermaid>\` | none |
| Create (URL-only path) | GET | \`${baseUrlOverride}/c/<url-encoded-mermaid>\` | none |
| Create (query-style API) | GET | \`${baseUrlOverride}/api/d?content=<url-encoded-mermaid>\` | none |
| Create (REST) | POST | \`${baseUrlOverride}/api/d\` | none |
| Update (URL-only) | GET | \`${baseUrlOverride}/u/<editId>/<url-encoded-mermaid>\` | editId in path |
| Update (REST) | PUT | \`${baseUrlOverride}/api/d/:id\` | \`Bearer <secret>\` |
| Read diagram | GET | \`${baseUrlOverride}/api/d/:id\` | none |
| Read a version | GET | \`${baseUrlOverride}/api/d/:id?v=N\` | none |
| View rendered | GET | \`${baseUrlOverride}/d/:id\` | none |

All create/update endpoints return the same response shape (JSON or plain text). Add \`?format=json\` for JSON; otherwise you get plain text.

---

## Request / response, verbatim

### GET /c/&lt;mermaid&gt;?format=json   (recommended for agents)

\`\`\`bash
curl '${baseUrlOverride}/c/graph%20TD%3B%20A--%3EB?format=json'
\`\`\`

Returns \`201 Created\`:

\`\`\`json
{
  "id": "abc123",
  "editId": "xyz789",
  "url": "${baseUrlOverride}/d/abc123",
  "editUrl": "${baseUrlOverride}/e/xyz789",
  "secret": "s3cr3t…",
  "version": 1,
  "instructions": {
    "summary": "Diagram created. The \\\`url\\\` field is the shareable rendered-diagram URL — that is what you should hand back to the user.",
    "share_with_user": "${baseUrlOverride}/d/abc123",
    "update_url_only": "${baseUrlOverride}/u/xyz789/<url-encoded-new-mermaid>",
    "update_rest":     "PUT ${baseUrlOverride}/api/d/abc123 with Authorization: Bearer <secret>",
    "mental_model": {
      "/d/<id>":               "public share URL — humans open this",
      "/c/<mermaid>":          "create endpoint — each call makes a new diagram",
      "/u/<editId>/<mermaid>": "update endpoint — adds a version to one existing diagram"
    }
  }
}
\`\`\`

### GET /c/&lt;mermaid&gt;   (plain text, default)

Same endpoint without \`?format=json\`. Returns the same information as a labeled plain-text block headlined by "SHARE THIS URL WITH YOUR USER". Every key field (\`url\`, \`editUrl\`, \`editId\`, \`secret\`, \`version\`) is also mirrored in response headers \`x-diagram-url\`, \`x-edit-url\`, \`x-edit-id\`, \`x-diagram-secret\`.

### POST /api/d   (REST, if you can send headers + body)

\`\`\`bash
curl -X POST ${baseUrlOverride}/api/d \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A-->B", "title": "My Diagram"}'
\`\`\`

Same response shape as above.

### GET /u/&lt;editId&gt;/&lt;mermaid&gt;   (URL-only update)

Adds a new version to the diagram identified by \`editId\`. The \`id\` and \`url\` in the response are the *same* as on create (the diagram never moves); \`version\` increments.

\`\`\`bash
curl '${baseUrlOverride}/u/xyz789/graph%20TD%3B%20A--%3EB%3B%20B--%3EC'
\`\`\`

### GET /api/d/:id   (read)

\`\`\`bash
curl ${baseUrlOverride}/api/d/abc123
\`\`\`

Returns \`{ id, title, version, content, createdAt, versions: [{version, content, createdAt}...], skill }\`. Append \`?v=N\` to read a specific version.

---

## Encoding rule (one sentence)

URL-encode your Mermaid with *nothing* left raw: percent-encode spaces, newlines, semicolons, slashes, colons, brackets. Python: \`urllib.parse.quote(mermaid, safe='')\`. JavaScript: \`encodeURIComponent(mermaid)\`.

---

## Practical limits & edge cases

- **URL length cap**: ~8KB URL (~5KB raw Mermaid after encoding). Beyond that, switch to \`POST /api/d\`. URLs between ~8KB and ~25KB may 502 at the edge; 25KB+ returns 414.
- **Invalid Mermaid** → \`400 invalid_syntax\` with the parser message. Your content is *not* saved.
- **Validator crash on our side** (rare) → the diagram is saved anyway; response includes \`x-validation: skipped\` and a \`warning\` field. Open the view URL to confirm it rendered.
- **Unicode** (Chinese, emoji, etc.) round-trips fine as long as you URL-encode it.
- **Supported types**: flowchart, sequence, class, state, entity-relationship, gantt, pie, quadrant, requirement, gitgraph, mindmap, timeline, sankey, block, packet, kanban, architecture.

---

## Agent failure modes to avoid

1. **Returning the \`/c/…\` URL to the user.** That's the endpoint, not the share link. Return the \`url\` field from the response.
2. **Not fetching the endpoint at all.** Constructing a \`/c/...\` URL without actually calling it does *not* create a diagram. The diagram is created *by the call*.
3. **Losing the \`secret\`.** It's returned exactly once on create. If you may update via REST later, store it for the session.
4. **Calling \`/c/\` again to update.** That creates a *new* diagram. Use \`/u/<editId>/…\` to add a version to an existing one.

---

## Content negotiation

Send \`Accept: text/markdown\` (or no \`Accept\` header, or anything that isn't \`text/html\`) to any page URL and you get clean Markdown. That's how this page is served to you. Human browsers get the rendered site.

---

## MCP (for MCP-connected agents)

\`\`\`json
{ "mcpServers": { "mermaid-viewer": { "url": "${baseUrlOverride}/mcp" } } }
\`\`\`

Tools: \`create_diagram\`, \`update_diagram\`, \`get_diagram\`. Same backing store; use whichever transport (URL, REST, MCP) suits your agent.

---

## Rules

1. Save the \`secret\` from create — returned once, required for REST updates.
2. Content must be valid Mermaid syntax.
3. Each update creates a new version. Nothing is ever overwritten.
4. Return the \`url\` field (\`${baseUrlOverride}/d/<id>\`) to the user. Never return the endpoint URL you called.
5. Diagrams are free, public, and permanent. Anyone with the URL can view.
`;
}

/**
 * Per-diagram markdown (served from `/d/<id>` when the client asks for
 * non-HTML). Self-contained: diagram ID, source, version history, and a
 * pointer back to the single-page spec above.
 */
export function getDiagramMarkdown(
  baseUrlArg: string,
  diagram: { id: string; title: string; createdAt: string },
  currentVersion: { version: number; content: string; createdAt: string },
  allVersions: { version: number; createdAt: string }[],
): string {
  const versionRows = allVersions
    .map((v) => `| v${v.version} | ${v.createdAt} |`)
    .join("\n");

  return `# ${diagram.title}

- **ID**: \`${diagram.id}\`
- **Version**: ${currentVersion.version} of ${allVersions.length}
- **Created**: ${diagram.createdAt}
- **View**: [${baseUrlArg}/d/${diagram.id}](${baseUrlArg}/d/${diagram.id})

## Diagram Source (v${currentVersion.version})

\`\`\`mermaid
${currentVersion.content}
\`\`\`

## Version History

| Version | Created |
|---|---|
${versionRows}

## API

- Fetch this diagram as JSON: \`GET ${baseUrlArg}/api/d/${diagram.id}\`
- Fetch a specific version: \`GET ${baseUrlArg}/api/d/${diagram.id}?v=N\`
- Full API spec (single page, everything): [${baseUrlArg}/](${baseUrlArg}/)
`;
}

/**
 * /llms.txt — the lightweight discovery file that some tooling conventions
 * look for at the root. Points at the full spec; doesn't duplicate it.
 */
export function getLlmsTxt(baseUrlOverride: string = baseUrl): string {
  return `# merm.sh

> Versioned Mermaid diagram hosting. One GET creates a diagram; share the returned \`/d/<id>\` URL with the user.

## The full spec is one page

Everything an agent needs — endpoints, request/response shapes, encoding rules, failure modes, MCP — lives at:

  ${baseUrlOverride}/

You are already getting that page as Markdown if you \`curl\` the root or send \`Accept: text/markdown\`. Just read it; there's nothing more to discover.

## 30-second summary

\`\`\`bash
curl '${baseUrlOverride}/c/<url-encoded-mermaid>?format=json'
# returns { url: "${baseUrlOverride}/d/<id>", editId, secret, version, ... }
# give the user the "url" field — never give them the /c/... URL.
\`\`\`

Updates go through \`${baseUrlOverride}/u/<editId>/<url-encoded-new-mermaid>\` (GET) or \`PUT ${baseUrlOverride}/api/d/<id>\` with \`Bearer <secret>\` (REST).
`;
}

export function getLlmsFullTxt(baseUrlOverride: string = baseUrl): string {
  // llms-full.txt is the full spec verbatim — no separate index prepended.
  return getMachineMarkdown(baseUrlOverride);
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
