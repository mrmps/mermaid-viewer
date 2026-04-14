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
      className="px-3 py-1.5 min-h-[40px] text-xs rounded-md transition-[background-color,transform] duration-150 cursor-pointer bg-secondary text-secondary-foreground active:scale-[0.96]"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
