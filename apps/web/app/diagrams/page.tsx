import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getDiagramCount, getRecentDiagramsWithContent } from "@mermaid-viewer/db";
import { DiagramsList } from "./diagrams-list";
import { ArrowLeft } from "@/components/icons/mingcute";

export const metadata: Metadata = {
  title: "All Diagrams — merm.sh",
  description: "Browse all versioned Mermaid diagrams created on merm.sh.",
};

export default async function DiagramsPage() {
  await connection();
  const [count, serverRecent] = await Promise.all([
    getDiagramCount(),
    getRecentDiagramsWithContent(50),
  ]);

  return (
    <main className="max-w-[692px] mx-auto w-full px-6 py-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-[28px] font-semibold leading-[1.15] text-foreground">
          All diagrams
        </h1>
        <span className="text-sm text-muted-foreground tabular-nums">
          {count.toLocaleString()} total
        </span>
      </div>

      <DiagramsList
        serverDiagrams={serverRecent.map((d) => ({
          id: d.id,
          title: d.title,
          updatedAt: d.updatedAt.toISOString(),
          content: d.content,
        }))}
      />
    </main>
  );
}
