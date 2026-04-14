"use client";

import { useEffect, useState } from "react";
import { getHistory } from "@/components/history-tracker";

type DiagramEntry = {
  id: string;
  title: string;
  timestamp: string;
};

export function DiagramsList({
  serverDiagrams,
}: {
  serverDiagrams: { id: string; title: string; updatedAt: string }[];
}) {
  const [diagrams, setDiagrams] = useState<DiagramEntry[]>(() =>
    serverDiagrams.map((d) => ({
      id: d.id,
      title: d.title,
      timestamp: d.updatedAt,
    }))
  );

  useEffect(() => {
    const local = getHistory();
    if (local.length === 0) return;

    const map = new Map<string, DiagramEntry>();
    for (const d of serverDiagrams) {
      map.set(d.id, { id: d.id, title: d.title, timestamp: d.updatedAt });
    }
    for (const l of local) {
      const existing = map.get(l.id);
      if (existing) {
        if (new Date(l.visitedAt) > new Date(existing.timestamp)) {
          existing.timestamp = l.visitedAt;
          existing.title = l.title;
        }
      } else {
        map.set(l.id, { id: l.id, title: l.title, timestamp: l.visitedAt });
      }
    }

    setDiagrams(
      [...map.values()].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    );
  }, [serverDiagrams]);

  if (diagrams.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No diagrams yet. Create one via the API or visit a diagram link.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {diagrams.map((entry) => (
        <a
          key={entry.id}
          href={`/d/${entry.id}`}
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
        </a>
      ))}
    </div>
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
