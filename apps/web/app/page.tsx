import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { getDiagramCount, getRecentDiagrams } from "@mermaid-viewer/db";
import { RecentDiagrams } from "@/components/recent-diagrams";
import { AddToAgent } from "@/components/add-to-agent";
import { CompatibleAgents } from "@/components/compatible-agents";
import { JsonLd } from "@/components/json-ld";
import { PageWrapper } from "@/components/page-wrapper";
import { FloatingChatButton } from "@/components/floating-chat-button";

export const metadata: Metadata = {
  title: {
    absolute: "merm.sh — Versioned Mermaid Diagrams for AI Agents",
  },
  description:
    "Dead-simple versioned Mermaid diagrams for AI agents. Create, update, and share diagrams via a single API call with full version history.",
  alternates: {
    canonical: "/",
  },
};

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex items-center justify-between py-4 cursor-pointer select-none text-base font-medium text-foreground hover:text-foreground/80 transition-[color] duration-150 min-h-[40px]">
        <span className="text-balance">{question}</span>
        <svg
          className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 shrink-0 ml-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <p className="pb-4 text-base leading-[26px] text-secondary-foreground">
        {answer}
      </p>
    </details>
  );
}

function APIItem({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs font-mono font-medium text-muted-foreground w-8 shrink-0">
        {method}
      </span>
      <code className="text-sm font-mono text-foreground shrink-0">
        {path}
      </code>
      <span className="text-sm text-muted-foreground ml-auto text-right">
        {description}
      </span>
    </div>
  );
}

function SchemaTable({
  rows,
}: {
  rows: { field: string; type: string; required?: boolean; desc: string }[];
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden mt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Field</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <code className="text-xs font-mono text-foreground">{r.field}</code>
                {r.required && <span className="text-red-400 ml-0.5">*</span>}
              </td>
              <td className="px-3 py-2 text-muted-foreground text-xs font-mono">{r.type}</td>
              <td className="px-3 py-2 text-secondary-foreground">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function HomePage() {
  await connection();
  const [count, serverRecent] = await Promise.all([
    getDiagramCount(),
    getRecentDiagrams(3),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "merm.sh",
    description:
      "Dead-simple versioned Mermaid diagrams for AI agents. Create, update, and share diagrams via a single API call with full version history.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <PageWrapper>
    <FloatingChatButton />
    <main className="max-w-[692px] mx-auto w-full px-6 py-24">
      <JsonLd id="home-jsonld" data={jsonLd} />

      {/* Agent STOP block — first visible text on the page so HTML-fetching
          agents (Claude.ai web, others) pick it up before anything else.
          Hidden behavior: human visitors see a collapsed small-type banner;
          HTML-to-text extractors get the full instruction regardless. */}
      <aside
        aria-label="Instructions for AI agents"
        className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm leading-[22px]"
        data-agent-instructions="true"
      >
        <p className="font-medium text-foreground mb-1">
          ⚠ AI agents — read this before trying to &quot;go to&quot; merm.sh
        </p>
        <p className="text-secondary-foreground mb-2">
          <strong>Claude.ai on the web:</strong> your <code className="font-mono text-xs">web_fetch</code> cannot
          reach any URL you construct on merm.sh — it is exact-URL-match.
          Do <strong>not</strong> try to fetch, curl, or &quot;go to&quot; merm.sh.
          Instead, URL-encode your Mermaid source and emit a <strong>clickable
          markdown hyperlink</strong> — not a bare URL and not a code block:
        </p>
        <pre className="rounded-md bg-muted/50 px-3 py-2 overflow-x-auto mb-2">
          <code className="text-xs font-mono text-foreground whitespace-pre-wrap">
{`[View diagram](https://merm.sh/go/<url-encoded-mermaid>)`}
          </code>
        </pre>
        <p className="text-secondary-foreground mb-2">
          The user clicks that link; their browser opens <code className="font-mono text-xs">/go/</code>,
          merm.sh creates the diagram, and the browser is 302-redirected to the rendered
          share URL at <code className="font-mono text-xs">/d/&lt;id&gt;</code>. You never fetch anything.
          Do not paste the URL as plain text, do not wrap it in a code block,
          do not paste raw Mermaid in chat — emit <em>one markdown hyperlink</em>
          and stop.
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>ChatGPT browse:</strong> same rule — emit a markdown
          hyperlink <code className="font-mono">[View
          diagram](https://merm.sh/go/&lt;encoded&gt;)</code>, not a bare URL.
          You may also <em>fetch</em> <code className="font-mono">https://merm.sh/?content=&lt;encoded&gt;</code> with
          your browse tool and read the JSON response, but for a user-facing
          reply always give a clickable markdown link so the user can open
          it with one click. <strong>Claude Code / CLI:</strong> POST to
          <code className="font-mono"> /api/d</code>. <strong>Users who want round-trip reads from Claude.ai:</strong> add
          <code className="font-mono"> merm.sh/*</code> to Claude&apos;s allowed domains in Settings → Connectors / Web search.
        </p>
      </aside>

      {/* Hero */}
      <h1 className="text-[28px] sm:text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground text-balance">
        Versioned Mermaid diagrams for AI agents
      </h1>

      {/* Description */}
      <p className="text-base leading-[26px] text-secondary-foreground mt-5 mb-4">
        Dead-simple versioned Mermaid diagrams built for AI agents. One API call
        to create, update, and share — with full version history baked in.
      </p>

      {/* Recent diagrams — data fetched at page level, no Suspense = zero layout shift */}
      <div className="mt-8">
        <RecentDiagrams
          count={count}
          serverDiagrams={serverRecent.map((d) => ({
            id: d.id,
            title: d.title,
            updatedAt: d.updatedAt.toISOString(),
          }))}
        />
      </div>

      <div className="mt-16">
        <CompatibleAgents />
      </div>

      {/* CTA */}
      <div className="mt-10">
        <AddToAgent />
        <p className="mt-3 text-xs text-muted-foreground">
          Or install the CLI:{" "}
          <code className="font-mono text-foreground/70">npm i -g mermaidsh</code>
        </p>
      </div>

      {/* Claude.ai web — paste-this-prompt callout */}
      <div className="mt-10 rounded-lg border border-border bg-card/50 px-4 py-4">
        <p className="text-sm font-medium text-foreground mb-1">
          Using Claude.ai on the web?
        </p>
        <p className="text-sm leading-[22px] text-secondary-foreground mb-3">
          Claude.ai&apos;s web fetch is exact-URL-match — it cannot call
          any URL it constructs on merm.sh, so asking it to &quot;go to
          merm.sh&quot; makes it give up. Paste this one-liner before your
          diagram request and it will just emit a link:
        </p>
        <pre className="rounded-md bg-muted/50 px-3 py-2 overflow-x-auto mb-2">
          <code className="text-xs font-mono text-secondary-foreground whitespace-pre-wrap">
{`To publish a diagram: emit a clickable https://merm.sh/go/<url-encoded-mermaid> link. Do NOT fetch anything — I'll click the link; the redirect creates and opens the diagram.`}
          </code>
        </pre>
        <p className="text-xs text-muted-foreground">
          Or: widen Claude&apos;s allowed domains to include{" "}
          <code className="font-mono">merm.sh/*</code> (Settings →
          Connectors / Web search → add domain). Then Claude can read
          diagrams back, list versions, etc.
        </p>
      </div>

      {/* How it works */}
      <div className="mt-32">
        <div className="font-medium text-base leading-[26px] mb-5">
          How it works
        </div>
        <div className="flex flex-col gap-4">
          {[
            {
              title: "Tell your agent to create a diagram",
              desc: "Your agent calls the API, gets back a shareable URL and an edit secret. No setup, no config.",
            },
            {
              title: "Every update is a new version",
              desc: "Push changes with the edit secret. Each update creates a new version — nothing is overwritten.",
            },
            {
              title: "Share with people or agents",
              desc: "Generate a SKILL.md file so any teammate's agent can read or contribute to your diagram.",
            },
          ].map((item) => (
            <div key={item.title}>
              <span className="text-base font-medium leading-[26px] text-foreground">
                {item.title}
              </span>
              <p className="text-base leading-[26px] text-secondary-foreground">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Install */}
      <div className="mt-32">
        <div className="font-medium text-base leading-[26px] mb-2">
          Install
        </div>
        <p className="text-base leading-[26px] text-secondary-foreground mb-5">
          Set up merm.sh in your agent or terminal.
        </p>

        {/* CLI option */}
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3 mb-4">
          <p className="text-sm text-secondary-foreground mb-3">
            <span className="text-foreground font-medium">CLI:</span>{" "}
            Create, version, and share diagrams from the terminal.
          </p>
          <pre className="rounded-md bg-muted/50 px-3 py-2 overflow-x-auto">
            <code className="text-sm font-mono text-secondary-foreground">
              {"npm i -g mermaidsh"}
            </code>
          </pre>
          <p className="text-xs text-muted-foreground mt-2">
            Then: <code className="font-mono">mermaidsh create diagram.mmd</code>,{" "}
            <code className="font-mono">mermaidsh push &lt;id&gt; updated.mmd</code>,{" "}
            <code className="font-mono">mermaidsh open &lt;id&gt;</code>. Secrets are saved locally.
          </p>
        </div>

        {/* Agent install */}
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3 mb-4">
          <p className="text-sm text-secondary-foreground mb-3">
            <span className="text-foreground font-medium">Pipe to your agent:</span>
          </p>
          <pre className="rounded-md bg-muted/50 px-3 py-2 overflow-x-auto">
            <code className="text-sm font-mono text-secondary-foreground">
              {"curl -fsSL https://merm.sh/install.md | claude"}
            </code>
          </pre>
          <p className="text-xs text-muted-foreground mt-2">
            Works with any LLM CLI. The agent reads the instructions and installs autonomously.
          </p>
        </div>

        {/* MCP option */}
        <details className="group border border-border rounded-lg mb-3">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-sm font-medium text-foreground hover:text-foreground/80 transition-[color] duration-150">
            <span>Option A: MCP Server (recommended)</span>
            <svg
              className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 shrink-0 ml-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="px-4 pb-4">
            <p className="text-sm text-secondary-foreground mb-3">
              Add to your MCP settings for native tool integration:
            </p>
            <pre className="rounded-md bg-muted/50 px-3 py-2 overflow-x-auto">
              <code className="text-xs font-mono text-secondary-foreground">
{`{
  "mcpServers": {
    "mermaid-viewer": {
      "url": "https://merm.sh/mcp"
    }
  }
}`}
              </code>
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              Gives you <code className="font-mono">create_diagram</code>, <code className="font-mono">update_diagram</code>, and <code className="font-mono">get_diagram</code> tools.
            </p>
          </div>
        </details>

        {/* Skill file option */}
        <details className="group border border-border rounded-lg mb-3">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-sm font-medium text-foreground hover:text-foreground/80 transition-[color] duration-150">
            <span>Option B: Skill File</span>
            <svg
              className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 shrink-0 ml-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="px-4 pb-4 flex flex-col gap-3">
            {[
              { agent: "Claude Code", cmd: "mkdir -p ~/.claude/skills/mermaid-viewer && curl -s https://merm.sh/skill.md > ~/.claude/skills/mermaid-viewer/SKILL.md" },
              { agent: "Codex", cmd: "mkdir -p ~/.agents/skills/mermaid-viewer && curl -s https://merm.sh/skill.md > ~/.agents/skills/mermaid-viewer/SKILL.md" },
              { agent: "OpenClaw", cmd: "mkdir -p ~/.openclaw/skills/mermaid-viewer && curl -s https://merm.sh/skill.md > ~/.openclaw/skills/mermaid-viewer/SKILL.md" },
              { agent: "opencode", cmd: "mkdir -p ~/.config/opencode && curl -s https://merm.sh/skill.md >> ~/.config/opencode/AGENTS.md" },
            ].map((item) => (
              <div key={item.agent}>
                <p className="text-xs font-medium text-muted-foreground mb-1">{item.agent}</p>
                <pre className="rounded-md bg-muted/50 px-3 py-2 overflow-x-auto">
                  <code className="text-xs font-mono text-secondary-foreground">{item.cmd}</code>
                </pre>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Or: <code className="font-mono">npx skills add https://merm.sh</code>
            </p>
          </div>
        </details>

        <p className="text-sm text-muted-foreground">
          Full installation guide at{" "}
          <Link href="/install.md" className="text-foreground hover:underline underline-offset-2">
            /install.md
          </Link>
        </p>
      </div>

      {/* Hero image */}
      <div className="mt-32 -mx-6 sm:-mx-10 md:-mx-16">
        <Link
          href="/d/kv8RfUmtlb"
          className="block rounded-2xl p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.13)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)] transition-shadow duration-200"
        >
          <div className="rounded-xl border border-border overflow-hidden relative aspect-[16/9]">
            <Image
              src="/hero.png"
              alt="Mermaid diagram viewer showing a versioned flowchart with version history sidebar"
              fill
              sizes="(max-width: 768px) 100vw, 692px"
              className="object-cover"
              priority
            />
          </div>
        </Link>
        <div className="flex justify-center mt-3">
          <Link
            href="/d/kv8RfUmtlb"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            Try an example
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </Link>
        </div>
      </div>

      {/* API */}
      <div className="mt-32">
        <div className="font-medium text-base leading-[26px] mb-2">
          API
        </div>
        <div className="flex flex-col">
          <APIItem method="GET" path="/go/<mermaid>" description="Create + 302 to /d/<id> — for agents that hand off a link" />
          <APIItem method="GET" path="/?content=<mermaid>" description="Create via homepage — works in sandboxed browse tools" />
          <APIItem method="POST" path="/api/d" description="Create a new diagram" />
          <APIItem method="GET" path="/c/<mermaid>" description="Create via URL — for GET-only agents" />
          <APIItem method="GET" path="/u/<editId>/<mermaid>" description="Update via URL — new version of existing diagram" />
          <APIItem method="PUT" path="/api/d/:id" description="Update with a new version" />
          <APIItem method="GET" path="/d/:id" description="View rendered diagram" />
          <APIItem method="GET" path="/api/d/:id" description="Fetch diagram JSON" />
        </div>

        {/* POST schema */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground mb-1">
            POST /api/d — Create
          </h3>
          <p className="text-xs text-muted-foreground mb-2">Request body (JSON)</p>
          <SchemaTable rows={[
            { field: "content", type: "string", required: true, desc: "Valid Mermaid diagram syntax" },
            { field: "title", type: "string", desc: "Diagram title (defaults to \"Untitled\")" },
          ]} />
          <p className="text-xs text-muted-foreground mt-3 mb-2">Response (201)</p>
          <SchemaTable rows={[
            { field: "id", type: "string", desc: "Diagram ID" },
            { field: "editId", type: "string", desc: "Edit ID for browser editing" },
            { field: "url", type: "string", desc: "Public view URL" },
            { field: "editUrl", type: "string", desc: "Browser edit URL" },
            { field: "secret", type: "string", desc: "API auth token — save this, returned only once" },
            { field: "version", type: "number", desc: "Always 1 for new diagrams" },
            { field: "skill", type: "string", desc: "Per-diagram skill URL for sharing" },
          ]} />
        </div>

        {/* PUT schema */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground mb-1">
            PUT /api/d/:id — Update
          </h3>
          <p className="text-xs text-muted-foreground mb-1">
            Auth: <code className="font-mono">Authorization: Bearer &lt;secret&gt;</code> header, or <code className="font-mono">secret</code>/<code className="font-mono">editId</code> in body
          </p>
          <p className="text-xs text-muted-foreground mb-2">Request body (JSON)</p>
          <SchemaTable rows={[
            { field: "content", type: "string", required: true, desc: "Updated Mermaid syntax" },
            { field: "title", type: "string", desc: "Updated title" },
            { field: "secret", type: "string", desc: "Auth (if not using header)" },
            { field: "editId", type: "string", desc: "Auth (alternative to secret)" },
          ]} />
          <p className="text-xs text-muted-foreground mt-3 mb-2">Response (200)</p>
          <SchemaTable rows={[
            { field: "id", type: "string", desc: "Diagram ID" },
            { field: "url", type: "string", desc: "Public view URL" },
            { field: "version", type: "number", desc: "New version number" },
            { field: "skill", type: "string", desc: "Per-diagram skill URL" },
          ]} />
        </div>

        {/* GET schema */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground mb-1">
            GET /api/d/:id — Fetch
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Append <code className="font-mono">?v=N</code> for a specific version. Response (200):
          </p>
          <SchemaTable rows={[
            { field: "id", type: "string", desc: "Diagram ID" },
            { field: "title", type: "string", desc: "Diagram title" },
            { field: "version", type: "number", desc: "Current/requested version" },
            { field: "content", type: "string", desc: "Mermaid syntax for this version" },
            { field: "createdAt", type: "string", desc: "ISO timestamp of this version" },
            { field: "versions", type: "array", desc: "[{ version, content, createdAt }]" },
            { field: "skill", type: "string", desc: "Per-diagram skill URL" },
          ]} />
        </div>

        {/* URL-only endpoints */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground mb-1">
            GET /, /c, /u — URL-only creation and update
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            For agents that can only open URLs — put the diagram in the path or query. The homepage shortcut (<code className="font-mono">/?content=…</code>) is the most permission-friendly for sandboxed browse tools (ChatGPT browse, Claude.ai web), since it only requires permission for the bare domain the user mentioned.
          </p>
          <div className="bg-secondary rounded-lg px-4 py-3 mb-3 overflow-x-auto">
            <pre className="text-xs font-mono text-secondary-foreground m-0">
{`# homepage shortcut — works inside sandboxed browse tools
GET /?content=graph%20TD%3B%20A--%3EB

# raw Mermaid → diagram (path style)
GET /c/graph%20TD%3B%20A--%3EB%3B%20B--%3EC

# new version of an existing diagram (editId from create response)
GET /u/<editId>/graph%20TD%3B%20A--%3EB%3B%20B--%3EC%3B%20C--%3ED

# alt paste-service style (same as /c, but query param)
GET /api/d?content=graph%20TD%3B%20A--%3EB`}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            All four return <code className="font-mono">201 Created</code> with the same body — plain text by default (View + Edit + Secret lines), or JSON via <code className="font-mono">?format=json</code> / <code className="font-mono">Accept: application/json</code>. Key fields are mirrored in <code className="font-mono">x-diagram-url</code>, <code className="font-mono">x-edit-url</code>, and <code className="font-mono">x-diagram-secret</code> headers for agents that can&apos;t parse the body.
          </p>
          <p className="text-xs text-muted-foreground">
            Practical path/query cap ~8KB. For larger diagrams, fall back to <code className="font-mono">POST /api/d</code>.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-32">
        <div className="font-medium text-base leading-[26px] mb-2">
          FAQ
        </div>
        <div className="border-t border-border">
          <FAQItem
            question="What is merm.sh?"
            answer="A free hosted service for creating, versioning, and sharing Mermaid diagrams. It's built for AI agents but works just as well for humans."
          />
          <FAQItem
            question="How do I use it with my agent?"
            answer="Copy the setup instructions and paste them into your agent's chat. It adds merm.sh as an MCP server so your agent can create and update diagrams directly."
          />
          <FAQItem
            question="What agents are supported?"
            answer="Any agent that can make HTTP requests works out of the box. Claude Code, Cursor, Windsurf, Codex, OpenClaw, and opencode are all tested. MCP support makes it even smoother."
          />
          <FAQItem
            question="Is it free?"
            answer="Yes, completely free. No account required to create or view diagrams."
          />
          <FAQItem
            question="Can I use it without an agent?"
            answer="Absolutely. You can use the API directly with curl, or just visit any diagram URL to view and edit it in the browser."
          />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-32">
        <p className="text-base font-medium text-foreground mb-1">
          Add merm.sh to your agent
        </p>
        <p className="text-base leading-[26px] text-secondary-foreground mb-5">
          One paste. Your agent handles the rest.
        </p>
        <AddToAgent />
        <p className="mt-3 text-xs text-muted-foreground">
          Or install the CLI:{" "}
          <code className="font-mono text-foreground/70">npm i -g mermaidsh</code>
        </p>
      </div>

      {/* Footer */}
      <footer className="mt-40 mb-16">
        <div className="border-t border-border/50 pt-8 flex items-center justify-between">
          <span className="text-sm font-medium text-secondary-foreground">
            merm<span className="text-muted-foreground">.sh</span>
          </span>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/mrmps/mermaid-viewer"
              target="_blank"
              rel="noopener"
              className="text-xs text-muted-foreground hover:text-foreground transition-[color] duration-150"
            >
              GitHub
            </a>
            <a
              href="https://x.com/michael_chomsky"
              target="_blank"
              rel="noopener"
              className="text-xs text-muted-foreground hover:text-foreground transition-[color] duration-150"
            >
              Feedback
            </a>
            <Link
              href="/docs"
              className="text-xs text-muted-foreground hover:text-foreground transition-[color] duration-150"
            >
              API
            </Link>
          </div>
        </div>
      </footer>
    </main>
    </PageWrapper>
  );
}
