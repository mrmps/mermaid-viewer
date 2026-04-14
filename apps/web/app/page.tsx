import type { Metadata } from "next";
import { RecentDiagrams } from "@/components/recent-diagrams";

export const metadata: Metadata = {
  title: {
    absolute: "mermaid-viewer — Versioned Mermaid Diagrams for AI Agents",
  },
  description:
    "Dead-simple versioned Mermaid diagrams for AI agents. Create, update, and share diagrams via a single API call with full version history.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "mermaid-viewer",
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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-app)", color: "var(--text-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1 flex flex-col items-center px-4 py-16 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight mb-2">mermaid-viewer</h1>
        <p className="text-lg mb-12" style={{ color: "var(--text-muted)" }}>
          Versioned Mermaid diagrams. One command to deploy.
        </p>

        {/* Recent diagrams */}
        <div className="w-full mb-12">
          <RecentDiagrams />
        </div>

        {/* Create */}
        <section className="w-full mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Create a diagram
          </h2>
          <pre className="rounded-xl p-4 text-sm font-mono overflow-x-auto" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-faint)" }}>$</span>{" "}
            <span style={{ color: "var(--accent)" }}>curl</span>{" "}
            <span style={{ color: "var(--text-primary)" }}>-X POST /api/d \</span>
            {"\n  "}<span style={{ color: "var(--text-primary)" }}>-H &quot;Content-Type: text/plain&quot; \</span>
            {"\n  "}<span style={{ color: "var(--text-primary)" }}>-d &apos;graph TD; A--&gt;B; B--&gt;C&apos;</span>
          </pre>
          <pre className="mt-2 rounded-xl p-4 text-sm font-mono overflow-x-auto" style={{ background: "var(--bg-inset)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
{`{
  "id": "abc123",
  "url": "/d/abc123",
  "editUrl": "/d/abc123?secret=...",
  "secret": "...",
  "version": 1
}`}
          </pre>
        </section>

        {/* Update */}
        <section className="w-full mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Update it
          </h2>
          <pre className="rounded-xl p-4 text-sm font-mono overflow-x-auto" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-faint)" }}>$</span>{" "}
            <span style={{ color: "var(--accent)" }}>curl</span>{" "}
            <span style={{ color: "var(--text-primary)" }}>-X PUT /api/d/abc123 \</span>
            {"\n  "}<span style={{ color: "var(--text-primary)" }}>-H &quot;Authorization: Bearer $SECRET&quot; \</span>
            {"\n  "}<span style={{ color: "var(--text-primary)" }}>-H &quot;Content-Type: text/plain&quot; \</span>
            {"\n  "}<span style={{ color: "var(--text-primary)" }}>-d &apos;graph TD; A--&gt;B; B--&gt;C; C--&gt;D&apos;</span>
          </pre>
        </section>

        {/* View */}
        <section className="w-full mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            View &amp; share
          </h2>
          <div className="rounded-xl p-4 text-sm" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <p className="mb-2" style={{ color: "var(--text-primary)" }}>
              Open the <code style={{ color: "var(--accent)" }}>url</code> in a browser to see your diagram rendered with full version history.
            </p>
            <p style={{ color: "var(--text-secondary)" }}>
              Share the <code style={{ color: "var(--accent)" }}>editUrl</code> with colleagues to let them push updates.
            </p>
          </div>
        </section>

        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          Every update is versioned. Every version is visible.
        </div>
      </main>
    </div>
  );
}
