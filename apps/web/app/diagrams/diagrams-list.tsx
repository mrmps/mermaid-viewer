"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import {
  type HistoryEntry,
  useHistoryEntries,
} from "@/components/history-tracker";
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
      {/* Search */}
      <div className="relative mb-5">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Search diagrams..."
          value={search}
          onChange={(e) => setSearch(e.target.value || null)}
          className="w-full h-12 pl-12 pr-4 rounded-xl border border-border bg-background text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/40 transition-[border-color,box-shadow] duration-150"
        />
        {search && (
          <button
            onClick={() => setSearch(null)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-secondary/50 border border-border/50 w-fit">
        <button
          onClick={() => setTab("viewer")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer ${
            tab === "viewer"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Viewer
        </button>
        <button
          onClick={() => setTab("list")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer ${
            tab === "list"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setTab("kanban")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer ${
            tab === "kanban"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Kanban
        </button>
      </div>

      {/* Result count when searching */}
      {search && (
        <p className="text-xs text-muted-foreground mb-3">
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
    <div className="flex flex-col divide-y divide-border">
      {diagrams.map((entry) => (
        <Link
          key={entry.id}
          href={entry.href}
          className="group flex items-center gap-3 py-3 hover:opacity-80 transition-opacity duration-150"
        >
          <span className="text-sm font-medium text-foreground truncate min-w-0 flex-1">
            {entry.title}
          </span>
          <span
            className="text-xs text-muted-foreground tabular-nums shrink-0"
            suppressHydrationWarning
          >
            {formatRelative(entry.timestamp)}
          </span>
          <svg
            className="w-3.5 h-3.5 text-muted-foreground shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      ))}
    </div>
  );
}

function ViewerGrid({ diagrams }: { diagrams: DiagramEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
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
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
      {columns.map(([type, items]) => (
        <div
          key={type}
          className="flex flex-col w-64 shrink-0 rounded-xl border border-border bg-muted/30"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {type}
            </span>
            <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
              {items.length}
            </span>
          </div>
          <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[60vh]">
            {items.map((entry) => (
              <Link
                key={entry.id}
                href={entry.href}
                className="group flex flex-col gap-1.5 p-3 rounded-lg bg-background border border-border/60 hover:border-border hover:shadow-sm transition-all duration-150"
              >
                <span className="text-sm font-medium text-foreground truncate">
                  {entry.title}
                </span>
                <span
                  className="text-[11px] text-muted-foreground"
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

