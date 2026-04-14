"use client";

import { useState } from "react";

export function ExcalidrawButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  async function openInExcalidraw() {
    // Copy mermaid source to clipboard
    await navigator.clipboard.writeText(content);
    setCopied(true);
    // Open Excalidraw in new tab
    window.open("https://excalidraw.com/", "_blank");
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="relative group">
      <button
        onClick={openInExcalidraw}
        className="px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
        style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        {copied ? "Copied! Paste ⌘⇧M" : "Excalidraw"}
      </button>
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-md whitespace-nowrap hidden group-hover:block pointer-events-none"
        style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
      >
        Copies diagram to clipboard — paste in Excalidraw with ⌘⇧M
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
          style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid var(--bg-surface)" }}
        />
      </div>
    </div>
  );
}
