"use client";

import { useEffect } from "react";

const HISTORY_KEY = "mermaid-viewer-history";
const MAX_HISTORY = 50;

export type HistoryEntry = {
  id: string;
  title: string;
  visitedAt: string;
};

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

export function HistoryTracker({ id, title }: { id: string; title: string }) {
  useEffect(() => {
    const history = getHistory();
    // Remove existing entry for this diagram (we'll re-add at top)
    const filtered = history.filter((e) => e.id !== id);
    filtered.unshift({
      id,
      title,
      visitedAt: new Date().toISOString(),
    });
    saveHistory(filtered);
  }, [id, title]);

  return null;
}
