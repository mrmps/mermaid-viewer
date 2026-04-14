import { getDiagramByEditId } from "@mermaid-viewer/db";
import { notFound } from "next/navigation";
import { DiagramPageShell } from "@/components/diagram-page-shell";
import { SourceProvider, ChatProvider } from "@/components/diagram-layout";
import { JsonLd } from "@/components/json-ld";
import type { MermaidTheme, MermaidLook } from "@/lib/mermaid-client";
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
      title: `${title} | merm.sh`,
      description,
      type: "article",
      url: `/d/${diagram.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | merm.sh`,
      description,
    },
  };
}

export default async function EditDiagramPage({
  params,
  searchParams,
}: {
  params: Promise<{ editId: string }>;
  searchParams: Promise<{ v?: string; theme?: string; look?: string }>;
}) {
  const { editId } = await params;
  const { v, theme: themeParam, look: lookParam } = await searchParams;
  const version = v ? parseInt(v, 10) : undefined;
  const theme: MermaidTheme = (themeParam as MermaidTheme) || "auto";
  const look: MermaidLook = (lookParam as MermaidLook) || "classic";

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
      <ChatProvider>
        <JsonLd id={`edit-diagram-jsonld-${editId}`} data={jsonLd} />
        <DiagramPageShell
          diagramId={diagram.id}
          title={diagram.title}
          versions={versionsForPanel}
          initialTheme={theme}
          initialLook={look}
          editId={editId}
        />
      </ChatProvider>
    </SourceProvider>
  );
}
