import { getDiagramByEditId } from "@mermaid-viewer/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MermaidRenderer } from "@/components/mermaid-renderer";
import { VersionPanel } from "@/components/version-panel";
import { ThemePicker } from "@/components/theme-picker";
import { ExcalidrawButton } from "@/components/excalidraw-button";
import { CopyImageButton } from "@/components/copy-image-button";
import { ShareButton } from "@/components/share-modal";
import { HistoryTracker } from "@/components/history-tracker";
import { ModeToggle } from "@/components/mode-toggle";
import { SourceProvider } from "@/components/diagram-layout";
import { SourceToggle, SourcePanel } from "@/components/source-panel";
import type { MermaidTheme } from "@/lib/mermaid-client";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ editId: string }>;
}): Promise<Metadata> {
  const { editId } = await params;
  const data = await getDiagramByEditId({ editId });

  if (!data) {
    return {
      title: "Diagram Not Found",
      description: "This diagram does not exist or has been removed.",
      robots: { index: false, follow: false },
    };
  }

  const { diagram, currentVersion } = data;
  const title =
    diagram.title !== "Untitled" ? diagram.title : `Diagram ${diagram.id}`;
  const snippet = currentVersion.content.slice(0, 120).replace(/\n/g, " ");
  const description = `${title} — a versioned Mermaid diagram (v${currentVersion.version}). ${snippet}`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/d/${diagram.id}`,
    },
    openGraph: {
      title: `${title} | mermaid-viewer`,
      description,
      type: "article",
      url: `/d/${diagram.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | mermaid-viewer`,
      description,
    },
  };
}

export default async function EditDiagramPage({
  params,
  searchParams,
}: {
  params: Promise<{ editId: string }>;
  searchParams: Promise<{ v?: string; theme?: string }>;
}) {
  const { editId } = await params;
  const { v, theme: themeParam } = await searchParams;
  const version = v ? parseInt(v, 10) : undefined;
  const theme: MermaidTheme = (themeParam as MermaidTheme) || "auto";

  const data = await getDiagramByEditId({ editId, version });
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
    <SourceProvider>
      <div className="flex flex-col h-screen bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <HistoryTracker id={diagram.id} title={diagram.title} />

        {/* Header */}
        <header
          className="flex items-center justify-between px-4 h-12 shrink-0 backdrop-blur-md border-b border-border bg-background"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <a
              href="/"
              className="text-xs font-bold transition-colors shrink-0 text-muted-foreground"
            >
              mermaid-viewer
            </a>
            <span className="text-muted-foreground/50">/</span>
            <h1 className="text-sm font-semibold truncate">{diagram.title}</h1>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 text-secondary-foreground bg-secondary tabular-nums"
            >
              v{currentVersion.version}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ThemePicker current={theme} diagramId={diagram.id} />
            <div className="w-px h-5 bg-border" />
            <ModeToggle />
            <div className="w-px h-5 bg-border" />
            <SourceToggle />
            <CopyImageButton content={currentVersion.content} theme={theme} />
            <ExcalidrawButton content={currentVersion.content} />
            <ShareButton
              diagramId={diagram.id}
              editId={editId}
              secret={diagram.secret}
              title={diagram.title}
              content={currentVersion.content}
              version={currentVersion.version}
            />
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 min-h-0">
          <Suspense fallback={<div className="w-52 border-r border-border" />}>
            <VersionPanel
              versions={versionsForPanel}
              currentVersion={currentVersion.version}
              diagramId={diagram.id}
              theme={theme}
            />
          </Suspense>

          <main className="flex-1 min-w-0 overflow-hidden">
            <MermaidRenderer content={currentVersion.content} theme={theme} />
          </main>

          <SourcePanel
            content={currentVersion.content}
            diagramId={diagram.id}
            editId={editId}
          />
        </div>
      </div>
    </SourceProvider>
  );
}
