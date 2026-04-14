"use client";

import { useEffect, useState } from "react";
import { getHistory, type HistoryEntry } from "./history-tracker";

export function RecentDiagrams() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  if (history.length === 0) return null;

  return (
    <section className="w-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
        Recent diagrams
      </h2>
      <div className="grid gap-2">
        {history.slice(0, 8).map((entry) => (
          <a
            key={entry.id}
            href={`/d/${entry.id}`}
            className="flex items-center justify-between px-4 py-3 rounded-xl transition-all group"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-surface-hover)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono shrink-0 transition-colors"
                style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
              >
                {entry.id.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate transition-colors" style={{ color: "var(--text-primary)" }}>
                  {entry.title}
                </p>
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                  /d/{entry.id}
                </p>
              </div>
            </div>
            <span className="text-[10px] shrink-0 ml-3" style={{ color: "var(--text-muted)" }}>
              {formatRelative(entry.visitedAt)}
            </span>
          </a>
        ))}
      </div>
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
  return `${diffDay}d ago`;
}
