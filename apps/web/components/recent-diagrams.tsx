"use client";

import { useMemo } from "react";
import Link from "next/link";
import { type HistoryEntry, useHistoryEntries } from "./history-tracker";
import { formatRelative } from "@/lib/utils";
import { ArrowRight, ChevronRight } from "@/components/icons/mingcute";

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
          <div className="flex flex-col">
            {diagrams.map((entry) => (
              <Link
                className="linear-item-row group flex min-h-10 items-center gap-3 border-b px-1.5 py-2.5 last:border-b-0"
                href={entry.href}
                key={entry.id}
              >
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
        ) : (
          <p className="text-sm text-muted-foreground pt-2">
            No diagrams yet. Create one via the API.
          </p>
        )}
      </div>
      {hasMore && (
        <Link
          className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
          href="/diagrams"
        >
          View all diagrams
          <ArrowRight className="size-3.5" />
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
