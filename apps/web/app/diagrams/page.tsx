"use client";

import { useEffect, useState } from "react";
import { getHistory, type HistoryEntry } from "@/components/history-tracker";

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

export default function DiagramsPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

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

      <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground mb-2">
        Recent diagrams
      </h1>
      <p className="text-base leading-[26px] text-secondary-foreground mb-10">
        All diagrams you've viewed, sorted by most recent.
      </p>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No diagrams yet. Create one via the API or visit a diagram link.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {history.map((entry) => (
            <a
              key={entry.id}
              href={`/d/${entry.id}`}
              className="group flex items-center gap-3 py-3 hover:opacity-80 transition-opacity duration-150"
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
      )}
    </main>
  );
}
