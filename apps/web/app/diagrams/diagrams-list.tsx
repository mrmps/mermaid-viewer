"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import {
  type HistoryEntry,
  useHistoryEntries,
} from "@/components/history-tracker";
import { DiagramCard } from "./diagram-card";

type DiagramEntry = {
  id: string;
  title: string;
  timestamp: string;
  content: string;
  href: string;
};

const tabs = ["viewer", "list"] as const;

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

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
