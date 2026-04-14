"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const HISTORY_KEY = "mermaid-viewer-history";
const HISTORY_EVENT = "mermaid-viewer-history-change";
const MAX_HISTORY = 50;
const EMPTY_HISTORY: HistoryEntry[] = [];

export type HistoryEntry = {
  id: string;
  title: string;
  visitedAt: string;
  href: string;
};

let cachedHistoryRaw = "[]";
let cachedHistory: HistoryEntry[] = EMPTY_HISTORY;

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return EMPTY_HISTORY;

  try {
    const raw = localStorage.getItem(HISTORY_KEY) || "[]";

    if (raw === cachedHistoryRaw) {
      return cachedHistory;
    }

    const parsed = JSON.parse(raw) as HistoryEntry[];
    cachedHistoryRaw = raw;
    cachedHistory = parsed;
    return parsed;
  } catch {
    cachedHistoryRaw = "[]";
    cachedHistory = EMPTY_HISTORY;
    return EMPTY_HISTORY;
  }
}

function saveHistory(entries: HistoryEntry[]) {
  const normalized = entries.slice(0, MAX_HISTORY);
  const raw = JSON.stringify(normalized);
  cachedHistoryRaw = raw;
  cachedHistory = normalized;
  localStorage.setItem(HISTORY_KEY, raw);
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

function subscribeToHistory(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== HISTORY_KEY) {
      return;
    }
    onStoreChange();
  };
  const handleHistoryChange = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(HISTORY_EVENT, handleHistoryChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(HISTORY_EVENT, handleHistoryChange);
  };
}

export function useHistoryEntries() {
  return useSyncExternalStore(
    subscribeToHistory,
    getHistory,
    () => EMPTY_HISTORY
  );
}

export function removeHistoryEntry(id: string) {
  if (typeof window === "undefined") return;
  const history = getHistory();
  saveHistory(history.filter((entry) => entry.id !== id));
}

export function HistoryTracker({ id, title }: { id: string; title: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const history = getHistory();
    // Remove existing entry for this diagram (we'll re-add at top)
    const filtered = history.filter((e) => e.id !== id);
    const query = searchParams.toString();

    filtered.unshift({
      id,
      title,
      visitedAt: new Date().toISOString(),
      href: query ? `${pathname}?${query}` : pathname,
    });
    saveHistory(filtered);
  }, [id, pathname, searchParams, title]);

  return null;
}
