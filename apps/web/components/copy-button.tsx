"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer"
      style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
