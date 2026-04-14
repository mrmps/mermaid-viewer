import { getDiagram } from "@mermaid-viewer/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MermaidRenderer } from "@/components/mermaid-renderer";
import { VersionPanel } from "@/components/version-panel";
import { ThemePicker } from "@/components/theme-picker";
import { ExcalidrawButton } from "@/components/excalidraw-button";
import { ShareButton } from "@/components/share-modal";
import { HistoryTracker } from "@/components/history-tracker";
import { ModeToggle } from "@/components/mode-toggle";
import type { MermaidTheme } from "@/lib/mermaid-client";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getDiagram({ id });

  if (!data) {
    return {
      title: "Diagram Not Found",
      description: "This diagram does not exist or has been removed.",
      robots: { index: false, follow: false },
    };
  }

  const { diagram, currentVersion } = data;
  const title =
    diagram.title !== "Untitled" ? diagram.title : `Diagram ${id}`;
  const snippet = currentVersion.content.slice(0, 120).replace(/\n/g, " ");
  const description = `${title} — a versioned Mermaid diagram (v${currentVersion.version}). ${snippet}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/d/${id}`,
    },
    openGraph: {
      title: `${title} | mermaid-viewer`,
      description,
      type: "article",
      url: `/d/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | mermaid-viewer`,
      description,
    },
  };
}

export default async function DiagramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string; secret?: string; theme?: string }>;
}) {
  const { id } = await params;
  const { v, secret, theme: themeParam } = await searchParams;
  const version = v ? parseInt(v, 10) : undefined;
  const theme: MermaidTheme = (themeParam as MermaidTheme) || "auto";

  const data = await getDiagram({ id, version });
  if (!data) notFound();

  const { diagram, currentVersion, allVersions } = data;

  const versionsForPanel = allVersions.map((v) => ({
    version: v.version,
    content: v.content,
    createdAt: v.createdAt.toISOString(),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: diagram.title,
    description: `Mermaid diagram with ${allVersions.length} version${allVersions.length !== 1 ? "s" : ""}`,
    version: currentVersion.version.toString(),
    dateCreated: diagram.createdAt.toISOString(),
    dateModified: currentVersion.createdAt.toISOString(),
    encodingFormat: "text/plain",
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-app)", color: "var(--text-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HistoryTracker id={id} title={diagram.title} />

      {/* Header */}
      <header
        className="flex items-center justify-between px-4 h-12 shrink-0 backdrop-blur-md"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-app)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <a
            href="/"
            className="text-xs font-bold transition-colors shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            mermaid-viewer
          </a>
          <span style={{ color: "var(--text-faint)" }}>/</span>
          <h1 className="text-sm font-semibold truncate">{diagram.title}</h1>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
            style={{ color: "var(--text-secondary)", background: "var(--bg-surface)" }}
          >
            v{currentVersion.version}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemePicker current={theme} diagramId={id} />
          <div className="w-px h-5" style={{ background: "var(--border)" }} />
          <ModeToggle />
          <div className="w-px h-5" style={{ background: "var(--border)" }} />
          <ExcalidrawButton content={currentVersion.content} />
          <ShareButton diagramId={id} secret={secret} />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <Suspense fallback={<div className="w-52" style={{ borderRight: "1px solid var(--border)" }} />}>
          <VersionPanel
            versions={versionsForPanel}
            currentVersion={currentVersion.version}
            diagramId={id}
            theme={theme}
          />
        </Suspense>

        <main className="flex-1 min-w-0 overflow-hidden">
          <MermaidRenderer content={currentVersion.content} theme={theme} />
        </main>
      </div>

      {/* Source footer */}
      <details className="shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
        <summary
          className="px-4 py-2 text-[11px] cursor-pointer select-none transition-colors font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Source
        </summary>
        <pre
          className="px-4 py-3 text-xs font-mono overflow-x-auto max-h-48"
          style={{ color: "var(--text-secondary)", background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)" }}
        >
          {currentVersion.content}
        </pre>
      </details>
    </div>
  );
}
