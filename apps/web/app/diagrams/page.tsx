import { connection } from "next/server";
import { getDiagramCount, getRecentDiagrams } from "@mermaid-viewer/db";
import { DiagramsList } from "./diagrams-list";

export default async function DiagramsPage() {
  await connection();
  const [count, serverRecent] = await Promise.all([
    getDiagramCount(),
    getRecentDiagrams(50),
  ]);

  return (
    <main className="max-w-[692px] mx-auto w-full px-6 py-24">
      <a
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 mb-8"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </a>

      <div className="flex items-baseline justify-between mb-10">
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground">
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
        }))}
      />
    </main>
  );
}
