"use client";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://mermaidsh.com";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-16 first:mt-0">
      <h2 className="text-base font-medium text-foreground mb-3">{title}</h2>
      {children}
    </div>
  );
}

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  return (
    <pre className="rounded-lg border border-border bg-card/80 px-4 py-3 overflow-x-auto">
      <code className="text-sm font-mono text-secondary-foreground leading-relaxed">
        {children}
      </code>
    </pre>
  );
}

export function MachineView() {
  return (
    <main className="max-w-[692px] mx-auto w-full px-6 py-24">
      {/* Callout */}
      <div className="rounded-lg border border-border bg-card/50 px-4 py-3 mb-10">
        <p className="text-sm leading-relaxed text-secondary-foreground">
          <span className="text-foreground font-medium">
            How to use this tool:
          </span>{" "}
          mermaid-viewer is a versioned Mermaid diagram hosting service for AI
          agents. Create diagrams via the API or MCP server below. Save the{" "}
          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
            secret
          </code>{" "}
          from create responses — it&apos;s the only way to update a diagram.
          Always share the diagram URL with your user so they can view it.
        </p>
      </div>

      <h1 className="text-[28px] sm:text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground text-balance">
        mermaid-viewer
      </h1>
      <p className="text-base leading-[26px] text-secondary-foreground mt-5">
        Versioned Mermaid diagram hosting for AI agents. One API call to create,
        update, and share — with full version history.
      </p>

      <Section title="Install">
        <p className="text-base leading-[26px] text-secondary-foreground mb-3">
          Pipe the install guide directly to your agent:
        </p>
        <CodeBlock>{`curl -fsSL ${BASE_URL}/install.md | claude`}</CodeBlock>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          Or read it at{" "}
          <a href="/install.md" className="text-foreground hover:underline underline-offset-2">/install.md</a>
        </p>

        <h3 className="text-sm font-medium text-foreground mb-2">
          MCP Server (recommended)
        </h3>
        <p className="text-sm text-secondary-foreground mb-2">
          Add to your MCP settings for native tool integration:
        </p>
        <CodeBlock lang="json">
          {JSON.stringify(
            {
              mcpServers: {
                "mermaid-viewer": {
                  url: `${BASE_URL}/mcp`,
                },
              },
            },
            null,
            2,
          )}
        </CodeBlock>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          Tools:{" "}
          <code className="text-xs font-mono">create_diagram</code>,{" "}
          <code className="text-xs font-mono">update_diagram</code>,{" "}
          <code className="text-xs font-mono">get_diagram</code>
        </p>

        <h3 className="text-sm font-medium text-foreground mb-2">
          Skill File (alternative)
        </h3>
        <CodeBlock>{`npx skills add ${BASE_URL}`}</CodeBlock>
      </Section>

      <Section title="REST API">
        <div className="flex flex-col">
          {[
            {
              method: "POST",
              path: "/api/d",
              desc: "Create a diagram",
            },
            {
              method: "PUT",
              path: "/api/d/:id",
              desc: "Update with new version",
            },
            {
              method: "GET",
              path: "/api/d/:id",
              desc: "Fetch diagram JSON",
            },
            {
              method: "GET",
              path: "/d/:id",
              desc: "View rendered diagram",
            },
          ].map((item) => (
            <div
              key={`${item.method}-${item.path}`}
              className="flex items-baseline gap-3 py-2 border-b border-border last:border-0"
            >
              <span className="text-xs font-mono font-medium text-muted-foreground w-8 shrink-0">
                {item.method}
              </span>
              <code className="text-sm font-mono text-foreground shrink-0">
                {item.path}
              </code>
              <span className="text-sm text-muted-foreground ml-auto text-right">
                {item.desc}
              </span>
            </div>
          ))}
        </div>

        {/* Create */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground mb-2">
            POST /api/d — Create
          </h3>
          <CodeBlock>
            {`curl -X POST ${BASE_URL}/api/d \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A-->B", "title": "My Diagram"}'`}
          </CodeBlock>
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Request body (JSON)</p>
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-3 py-1.5 text-foreground">content<span className="text-red-400">*</span></td>
                    <td className="px-3 py-1.5 text-muted-foreground">string</td>
                    <td className="px-3 py-1.5 text-secondary-foreground font-sans">Valid Mermaid syntax</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 text-foreground">title</td>
                    <td className="px-3 py-1.5 text-muted-foreground">string</td>
                    <td className="px-3 py-1.5 text-secondary-foreground font-sans">Optional (defaults to &quot;Untitled&quot;)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Response (201)</p>
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {[
                    ["id", "string", "Diagram ID"],
                    ["editId", "string", "Edit ID for browser editing"],
                    ["url", "string", "Public view URL (/d/:id)"],
                    ["editUrl", "string", "Browser edit URL (/e/:editId)"],
                    ["secret", "string", "API auth token — save this, only returned once"],
                    ["version", "number", "Always 1"],
                    ["skill", "string", "Per-diagram skill URL"],
                  ].map(([field, type, desc]) => (
                    <tr key={field} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-foreground">{field}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{type}</td>
                      <td className="px-3 py-1.5 text-secondary-foreground font-sans">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Update */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground mb-2">
            PUT /api/d/:id — Update
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Auth: <code className="font-mono">Authorization: Bearer &lt;secret&gt;</code> header, or <code className="font-mono">secret</code>/<code className="font-mono">editId</code> in JSON body
          </p>
          <CodeBlock>
            {`curl -X PUT ${BASE_URL}/api/d/:id \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A-->B; B-->C", "secret": "<secret>"}'`}
          </CodeBlock>
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Request body (JSON)</p>
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {[
                    ["content*", "string", "Updated Mermaid syntax"],
                    ["title", "string", "Updated title"],
                    ["secret", "string", "Auth (if not using header)"],
                    ["editId", "string", "Auth (alternative to secret)"],
                  ].map(([field, type, desc]) => (
                    <tr key={field} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-foreground">{field}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{type}</td>
                      <td className="px-3 py-1.5 text-secondary-foreground font-sans">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Response (200)</p>
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {[
                    ["id", "string", "Diagram ID"],
                    ["url", "string", "Public view URL"],
                    ["version", "number", "New version number"],
                    ["skill", "string", "Per-diagram skill URL"],
                  ].map(([field, type, desc]) => (
                    <tr key={field} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-foreground">{field}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{type}</td>
                      <td className="px-3 py-1.5 text-secondary-foreground font-sans">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Get */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground mb-2">
            GET /api/d/:id — Fetch
          </h3>
          <CodeBlock>{`curl ${BASE_URL}/api/d/:id`}</CodeBlock>
          <p className="text-xs text-muted-foreground mt-2 mb-1">
            Append <code className="text-xs font-mono">?v=N</code> for a specific version.
          </p>
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Response (200)</p>
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {[
                    ["id", "string", "Diagram ID"],
                    ["title", "string", "Diagram title"],
                    ["version", "number", "Current/requested version"],
                    ["content", "string", "Mermaid syntax for this version"],
                    ["createdAt", "string", "ISO timestamp"],
                    ["versions", "array", "[{ version, content, createdAt }]"],
                    ["skill", "string", "Per-diagram skill URL"],
                  ].map(([field, type, desc]) => (
                    <tr key={field} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-foreground">{field}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{type}</td>
                      <td className="px-3 py-1.5 text-secondary-foreground font-sans">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Supported Diagram Types">
        <p className="text-base leading-[26px] text-secondary-foreground">
          flowchart, sequence, class, state, entity-relationship, gantt, pie,
          quadrant, requirement, gitgraph, mindmap, timeline, sankey, block,
          packet, kanban, architecture
        </p>
      </Section>

      <Section title="Rules">
        <div className="flex flex-col gap-2">
          {[
            "Save the secret from create — it's returned only once and is required for updates",
            "Content must be valid Mermaid syntax",
            "Each update creates a new version — previous content is never lost",
            `Always send the diagram URL (${BASE_URL}/d/:id) to the user`,
            "The skill URL in create/update responses points to a per-diagram SKILL.md you can share with other agents",
            "Diagrams are free and public — anyone with the URL can view them",
          ].map((rule, i) => (
            <div
              key={i}
              className="flex gap-3 text-base leading-[26px] text-secondary-foreground"
            >
              <span className="text-muted-foreground shrink-0">
                {i + 1}.
              </span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Footer */}
      <footer className="mt-40 mb-16">
        <div className="border-t border-border/50 pt-8 flex items-center justify-between">
          <span className="text-sm font-medium text-secondary-foreground">
            mermaid<span className="text-muted-foreground">-viewer</span>
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
              href="/api/d"
              className="text-xs text-muted-foreground hover:text-foreground transition-[color] duration-150"
            >
              API
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
