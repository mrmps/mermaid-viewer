"use client";

import { useEffect, useState } from "react";
import { getHistory, type HistoryEntry } from "./history-tracker";

export function RecentDiagrams() {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  // Not yet loaded from localStorage — reserve space to prevent layout shift
  if (history === null) {
    return (
      <section className="w-full">
        <div className="font-medium text-base leading-[26px] mb-3 invisible">
          Recent diagrams
        </div>
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[22px] rounded bg-muted/50 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (history.length === 0) return null;

  const shown = history.slice(0, 3);
  const hasMore = history.length > 3;

  return (
    <section className="w-full">
      <div className="font-medium text-base leading-[26px] mb-3">
        Recent diagrams
      </div>
      <div className="flex flex-col divide-y divide-border">
        {shown.map((entry) => (
          <a
            key={entry.id}
            href={`/d/${entry.id}`}
            className="group flex items-center gap-3 py-2.5 hover:opacity-80 transition-opacity duration-150"
          >
            <span className="text-sm font-medium text-foreground truncate min-w-0 flex-1">
              {entry.title}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {formatRelative(entry.visitedAt)}
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
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
