"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";

type Props = {
  text: string;
  /** When true, renders a faint `$` shell-prompt marker before single-line commands. */
  prompt?: boolean;
  className?: string;
};

export function CopyBlock({ text, prompt = false, className }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  const isMultiline = text.includes("\n");

  return (
    <div className={`relative group ${className ?? ""}`}>
      <pre className="rounded-md bg-muted/50 border border-border/60 px-4 py-3.5 pr-11 overflow-x-auto">
        <code
          className={`block text-xs font-mono text-secondary-foreground leading-[1.55] ${
            isMultiline ? "whitespace-pre" : "whitespace-pre-wrap break-all"
          } ${prompt && !isMultiline ? "pl-6 -indent-6 before:content-['$'] before:inline-block before:w-5 before:-ml-6 before:pr-2 before:text-muted-foreground/50 before:select-none" : ""}`}
        >
          {text}
        </code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy"}
        className="absolute top-2 right-2 inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-[color,background-color,opacity] duration-150 cursor-pointer opacity-60 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
