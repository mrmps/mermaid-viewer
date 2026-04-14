"use client";

import { useEffect, useState } from "react";
import { getHistory } from "./history-tracker";

type DiagramEntry = {
  id: string;
  title: string;
  timestamp: string;
};

export function RecentDiagrams({
  count,
  serverDiagrams,
}: {
  count: number;
  serverDiagrams: { id: string; title: string; updatedAt: string }[];
}) {
  // Seed with server data so the first paint matches SSR exactly
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

    // Merge: index server diagrams by id, overlay local visits
    const map = new Map<string, DiagramEntry>();
    for (const d of serverDiagrams) {
      map.set(d.id, { id: d.id, title: d.title, timestamp: d.updatedAt });
    }
    for (const l of local) {
      const existing = map.get(l.id);
      if (existing) {
        // Keep whichever timestamp is more recent
        if (new Date(l.visitedAt) > new Date(existing.timestamp)) {
          existing.timestamp = l.visitedAt;
          existing.title = l.title;
        }
      } else {
        map.set(l.id, { id: l.id, title: l.title, timestamp: l.visitedAt });
      }
    }

    const merged = [...map.values()]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 3);

    setDiagrams(merged);
  }, [serverDiagrams]);

  const hasMore = count > 3;

  return (
    <section className="w-full">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-medium text-base leading-[26px]">
          Recent diagrams
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {count.toLocaleString()} created
        </span>
      </div>
      {/* min-h reserves space for 3 rows so content below never shifts,
          even if client-side merge briefly changes which entries appear */}
      <div className="min-h-[7.5rem]">
        {diagrams.length > 0 ? (
          <div className="flex flex-col divide-y divide-border">
            {diagrams.map((entry) => (
              <a
                key={entry.id}
                href={`/d/${entry.id}`}
                className="group flex items-center gap-3 py-2.5 hover:opacity-80 transition-opacity duration-150"
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
        ) : (
          <p className="text-sm text-muted-foreground pt-2">
            No diagrams yet — create one via the API.
          </p>
        )}
      </div>
      {hasMore && (
        <a
          href="/diagrams"
          className="inline-flex items-center gap-1 mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          View all diagrams
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      )}
    </section>
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
