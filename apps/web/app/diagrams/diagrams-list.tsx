"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import {
  type HistoryEntry,
  useHistoryEntries,
} from "@/components/history-tracker";
import { ChevronRight, Search, X } from "@/components/icons/mingcute";
import { formatRelative } from "@/lib/utils";
import { DiagramCard } from "./diagram-card";

export type DiagramEntry = {
  id: string;
  title: string;
  timestamp: string;
  content: string;
  href: string;
};

const tabs = ["viewer", "list", "kanban"] as const;

export function DiagramsList({
  serverDiagrams,
}: {
  serverDiagrams: {
    id: string;
    title: string;
    updatedAt: string;
    content: string;
  }[];
}) {
  const localHistory = useHistoryEntries();
  const diagrams = useMemo(
    () => mergeDiagrams(serverDiagrams, localHistory),
    [serverDiagrams, localHistory]
  );
  const [search, setSearch] = useQueryState("q", { defaultValue: "" });
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(tabs).withDefault("viewer")
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return diagrams;
    const q = search.toLowerCase();
    return diagrams.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    );
  }, [diagrams, search]);

  if (diagrams.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No diagrams yet. Create one via the API or visit a diagram link.
      </p>
    );
  }

  return (
    <div>
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-10 text-sm font-medium text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus:border-ring/40 focus:ring-3 focus:ring-ring/15"
          onChange={(e) => setSearch(e.target.value || null)}
          placeholder="Search diagrams"
          type="text"
          value={search}
        />
        {search && (
          <button
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setSearch(null)}
            type="button"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mb-6 flex w-fit gap-1 rounded-lg border border-border/70 bg-muted/45 p-1">
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
            tab === "viewer"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("viewer")}
          type="button"
        >
          Viewer
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
            tab === "list"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("list")}
          type="button"
        >
          List
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
            tab === "kanban"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("kanban")}
          type="button"
        >
          Kanban
        </button>
      </div>

      {search && (
        <p className="mb-3 text-xs tabular-nums text-muted-foreground">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No diagrams match &ldquo;{search}&rdquo;
        </p>
      ) : tab === "list" ? (
        <ListView diagrams={filtered} />
      ) : tab === "kanban" ? (
        <KanbanBoard diagrams={filtered} />
      ) : (
        <ViewerGrid diagrams={filtered} />
      )}
    </div>
  );
}

function ListView({ diagrams }: { diagrams: DiagramEntry[] }) {
  return (
    <div className="flex flex-col">
      {diagrams.map((entry) => (
        <Link
          className="linear-item-row group flex min-h-12 items-center gap-3 border-b px-2 py-2.5 last:border-b-0"
          href={entry.href}
          key={entry.id}
        >
          <span className="linear-item-chip hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[0.7rem] font-medium sm:inline-flex">
            {getDiagramType(entry.content)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {entry.title}
          </span>
          <span
            className="shrink-0 text-xs tabular-nums text-muted-foreground"
            suppressHydrationWarning
          >
            {formatRelative(entry.timestamp)}
          </span>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

function ViewerGrid({ diagrams }: { diagrams: DiagramEntry[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {diagrams.map((entry) => (
        <DiagramCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function getDiagramType(content: string): string {
  const first = content.trimStart().split(/[\s{(\[]/)[0].toLowerCase();
  const types: Record<string, string> = {
    graph: "Flowchart",
    flowchart: "Flowchart",
    sequencediagram: "Sequence",
    sequence: "Sequence",
    classdiagram: "Class",
    statediagram: "State",
    erdiagram: "ER Diagram",
    gantt: "Gantt",
    pie: "Pie Chart",
    mindmap: "Mind Map",
    timeline: "Timeline",
    gitgraph: "Git Graph",
    journey: "User Journey",
    quadrantchart: "Quadrant",
    requirementdiagram: "Requirement",
    c4context: "C4 Context",
    sankey: "Sankey",
    block: "Block",
    xychart: "XY Chart",
    kanban: "Kanban",
  };
  return types[first] ?? "Other";
}

function KanbanBoard({ diagrams }: { diagrams: DiagramEntry[] }) {
  const columns = useMemo(() => {
    const grouped = new Map<string, DiagramEntry[]>();
    for (const d of diagrams) {
      const type = getDiagramType(d.content);
      const list = grouped.get(type) ?? [];
      list.push(d);
      grouped.set(type, list);
    }
    // Sort columns by count descending
    return [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [diagrams]);

  return (
    <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-4">
      {columns.map(([type, items]) => (
        <div
          className="flex w-64 shrink-0 flex-col rounded-lg border border-border bg-muted/25"
          key={type}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {type}
            </span>
            <span className="linear-item-chip rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
              {items.length}
            </span>
          </div>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-2">
            {items.map((entry) => (
              <Link
                className="linear-item-row group flex flex-col gap-1.5 rounded-md border bg-background/70 p-3"
                href={entry.href}
                key={entry.id}
              >
                <span className="truncate text-sm font-semibold text-foreground">
                  {entry.title}
                </span>
                <span
                  className="text-[11px] tabular-nums text-muted-foreground"
                  suppressHydrationWarning
                >
                  {formatRelative(entry.timestamp)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function mergeDiagrams(
  serverDiagrams: {
    id: string;
    title: string;
    updatedAt: string;
    content: string;
  }[],
  localHistory: HistoryEntry[]
): DiagramEntry[] {
  const map = new Map<string, DiagramEntry>();

  for (const d of serverDiagrams) {
    map.set(d.id, {
      id: d.id,
      title: d.title,
      timestamp: d.updatedAt,
      content: d.content,
      href: `/d/${d.id}`,
    });
  }

  for (const l of localHistory) {
    const existing = map.get(l.id);
    if (existing) {
      if (new Date(l.visitedAt) > new Date(existing.timestamp)) {
        existing.timestamp = l.visitedAt;
        existing.title = l.title;
        existing.href = l.href || `/d/${l.id}`;
      }
      continue;
    }

    map.set(l.id, {
      id: l.id,
      title: l.title,
      timestamp: l.visitedAt,
      content: "",
      href: l.href || `/d/${l.id}`,
    });
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
