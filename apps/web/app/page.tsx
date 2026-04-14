import type { Metadata } from "next";
import { Suspense } from "react";
import { RecentDiagrams } from "@/components/recent-diagrams";
import { DiagramCount } from "@/components/diagram-count";
import { AddToAgent } from "@/components/add-to-agent";
import { CompatibleAgents } from "@/components/compatible-agents";
import { PageWrapper } from "@/components/page-wrapper";

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
    <PageWrapper>
    <main className="max-w-[692px] mx-auto w-full px-6 py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <h1 className="text-[28px] sm:text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground text-balance">
        Versioned Mermaid diagrams for AI agents
      </h1>

      {/* Description */}
      <p className="text-base leading-[26px] text-secondary-foreground mt-5 mb-4">
        Dead-simple versioned Mermaid diagrams built for AI agents. One API call
        to create, update, and share — with full version history baked in.
      </p>

      <Suspense fallback={null}>
        <div className="mt-3">
          <DiagramCount />
        </div>
      </Suspense>

      {/* Recent diagrams */}
      <Suspense fallback={null}>
        <div className="mt-10">
          <RecentDiagrams />
        </div>
      </Suspense>

      <div className="mt-16">
        <CompatibleAgents />
      </div>

      {/* CTA */}
      <div className="mt-10">
        <AddToAgent variant="button" />
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

      {/* API */}
      <div className="mt-32">
        <div className="font-medium text-base leading-[26px] mb-2">
          API
        </div>
        <div className="flex flex-col">
          <APIItem method="POST" path="/api/d" description="Create a new diagram" />
          <APIItem method="PUT" path="/api/d/:id" description="Update with a new version" />
          <APIItem method="GET" path="/d/:id" description="View rendered diagram" />
          <APIItem method="GET" path="/api/d/:id" description="Fetch diagram JSON" />
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-32">
        <div className="font-medium text-base leading-[26px] mb-2">
          FAQ
        </div>
        <div className="border-t border-border">
          <FAQItem
            question="What is mermaid-viewer?"
            answer="A free hosted service for creating, versioning, and sharing Mermaid diagrams. It's built for AI agents but works just as well for humans."
          />
          <FAQItem
            question="How do I use it with my agent?"
            answer="Copy the setup instructions and paste them into your agent's chat. It adds mermaid-viewer as an MCP server so your agent can create and update diagrams directly."
          />
          <FAQItem
            question="What agents are supported?"
            answer="Any agent that can make HTTP requests works out of the box. Claude Code, Cursor, Windsurf, Codex, and OpenClaw are all tested. MCP support makes it even smoother."
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
          Add mermaid-viewer to your agent
        </p>
        <p className="text-base leading-[26px] text-secondary-foreground mb-5">
          One paste. Your agent handles the rest.
        </p>
        <AddToAgent variant="button" />
      </div>

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
              href="https://x.com/michael_chomsky"
              target="_blank"
              rel="noopener"
              className="text-xs text-muted-foreground hover:text-foreground transition-[color] duration-150"
            >
              Feedback
            </a>
            <a
              href="/docs"
              className="text-xs text-muted-foreground hover:text-foreground transition-[color] duration-150"
            >
              API
            </a>
          </div>
        </div>
      </footer>
    </main>
    </PageWrapper>
  );
}
