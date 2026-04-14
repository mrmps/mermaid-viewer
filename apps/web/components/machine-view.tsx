"use client";

import { useEffect, useState, useCallback } from "react";

export function MachineView() {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/machine")
      .then((r) => r.text())
      .then((text) => {
        setMarkdown(text);
        setLoading(false);
      });
  }, []);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  return (
    <main className="max-w-[692px] mx-auto w-full px-6 py-24">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-sm font-medium text-foreground">Agent view</h1>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Exact Markdown served via content negotiation. Request any page
            with{" "}
            <code className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">
              Accept: text/markdown
            </code>{" "}
            to receive this response.
          </p>
        </div>
        <button
          onClick={copy}
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2 py-1 rounded border border-border bg-card/50 cursor-pointer"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {loading ? (
        <div className="h-96 bg-card/50 rounded-lg border border-border animate-pulse" />
      ) : (
        <pre className="rounded-lg border border-border bg-card/80 px-5 py-4 overflow-x-auto whitespace-pre-wrap text-sm font-mono leading-relaxed text-secondary-foreground selection:bg-foreground/10">
          {markdown}
        </pre>
      )}

      <div className="mt-6 space-y-2">
        <p className="text-xs text-muted-foreground font-mono">
          curl -H &quot;Accept: text/markdown&quot;{" "}
          {typeof window !== "undefined" ? window.location.origin : "https://mermaidsh.com"}/
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <a
            href="/llms.txt"
            className="text-foreground hover:underline underline-offset-2"
          >
            /llms.txt
          </a>
          <span className="text-border">|</span>
          <a
            href="/llms-full.txt"
            className="text-foreground hover:underline underline-offset-2"
          >
            /llms-full.txt
          </a>
          <span className="text-border">|</span>
          <a
            href="/api/machine"
            className="text-foreground hover:underline underline-offset-2"
          >
            /api/machine
          </a>
        </div>
      </div>
    </main>
  );
}
