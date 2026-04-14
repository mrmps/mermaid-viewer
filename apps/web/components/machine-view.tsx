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

      <Section title="MCP Server (recommended)">
        <p className="text-base leading-[26px] text-secondary-foreground mb-3">
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
        <p className="text-sm text-muted-foreground mt-2">
          Tools:{" "}
          <code className="text-xs font-mono">create_diagram</code>,{" "}
          <code className="text-xs font-mono">update_diagram</code>,{" "}
          <code className="text-xs font-mono">get_diagram</code>
        </p>
      </Section>

      <Section title="Skill File">
        <CodeBlock>{`npx skills add ${BASE_URL}`}</CodeBlock>
      </Section>

      <Section title="REST API">
        <div className="flex flex-col">
          {[
            {
              method: "POST",
              path: "/api/d",
              desc: "Create a diagram",
              auth: "None",
            },
            {
              method: "PUT",
              path: "/api/d/:id",
              desc: "Update with new version",
              auth: "Bearer <secret>",
            },
            {
              method: "GET",
              path: "/api/d/:id",
              desc: "Fetch diagram JSON",
              auth: "None",
            },
            {
              method: "GET",
              path: "/d/:id",
              desc: "View rendered diagram",
              auth: "None",
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
            Create a diagram
          </h3>
          <CodeBlock>
            {`curl -X POST ${BASE_URL}/api/d \\
  -H "Content-Type: application/json" \\
  -d '{"content": "graph TD; A-->B", "title": "My Diagram"}'`}
          </CodeBlock>
          <p className="text-sm text-muted-foreground mt-2">
            Response:{" "}
            <code className="text-xs font-mono">
              {"{ id, url, editUrl, secret, version, skill }"}
            </code>
          </p>
        </div>

        {/* Update */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Update a diagram
          </h3>
          <CodeBlock>
            {`curl -X PUT ${BASE_URL}/api/d/:id \\
  -H "Authorization: Bearer <secret>" \\
  -H "Content-Type: text/plain" \\
  -d 'graph TD; A-->B; B-->C'`}
          </CodeBlock>
        </div>

        {/* Get */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Get diagram data
          </h3>
          <CodeBlock>{`curl ${BASE_URL}/api/d/:id`}</CodeBlock>
          <p className="text-sm text-muted-foreground mt-2">
            Response:{" "}
            <code className="text-xs font-mono">
              {"{ id, title, version, content, versions, skill }"}
            </code>
            . Append <code className="text-xs font-mono">?v=N</code> for a
            specific version.
          </p>
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
