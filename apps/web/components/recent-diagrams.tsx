"use client";

import { useMemo } from "react";
import Link from "next/link";
import { type HistoryEntry, useHistoryEntries } from "./history-tracker";
import { formatRelative } from "@/lib/utils";

type DiagramEntry = {
  id: string;
  title: string;
  timestamp: string;
  href: string;
};

export function RecentDiagrams({
  count,
  serverDiagrams,
}: {
  count: number;
  serverDiagrams: { id: string; title: string; updatedAt: string }[];
}) {
  const localHistory = useHistoryEntries();
  const diagrams = useMemo(
    () => mergeRecentDiagrams(serverDiagrams, localHistory).slice(0, 3),
    [serverDiagrams, localHistory]
  );

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
              <Link
                key={entry.id}
                href={entry.href}
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
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground pt-2">
            No diagrams yet — create one via the API.
          </p>
        )}
      </div>
      {hasMore && (
        <Link
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
        </Link>
      )}
    </section>
  );
}

function mergeRecentDiagrams(
  serverDiagrams: { id: string; title: string; updatedAt: string }[],
  localHistory: HistoryEntry[]
): DiagramEntry[] {
  const map = new Map<string, DiagramEntry>();

  for (const d of serverDiagrams) {
    map.set(d.id, {
      id: d.id,
      title: d.title,
      timestamp: d.updatedAt,
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
      href: l.href || `/d/${l.id}`,
    });
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

