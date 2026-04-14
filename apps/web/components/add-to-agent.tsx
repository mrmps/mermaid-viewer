"use client";

import { useState, useCallback } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://mermaidsh.com";

function getPrompt() {
  return `Follow the installation instructions in the README at https://github.com/mrmps/mermaid-viewer to set up mermaid-viewer — a tool for creating, versioning, and sharing Mermaid diagrams at ${BASE_URL}.

## Quick start

### 1. Install the skill

**Claude Code:**
\`\`\`bash
mkdir -p ~/.claude/skills/mermaid-viewer
curl -s ${BASE_URL}/skill.md > ~/.claude/skills/mermaid-viewer/SKILL.md
\`\`\`

**Codex:**
\`\`\`bash
mkdir -p ~/.agents/skills/mermaid-viewer
curl -s ${BASE_URL}/skill.md > ~/.agents/skills/mermaid-viewer/SKILL.md
\`\`\`

**OpenClaw:**
\`\`\`bash
mkdir -p ~/.openclaw/skills/mermaid-viewer
curl -s ${BASE_URL}/skill.md > ~/.openclaw/skills/mermaid-viewer/SKILL.md
\`\`\`

**Cursor / Windsurf / Other agents:** Run \`curl -s ${BASE_URL}/skill.md\` and save the output wherever your agent reads persistent instructions from (.cursorrules, .windsurfrules, etc).

Or install via the skills CLI: \`npx skills add ${BASE_URL}\`

Once the skill is saved, read it and follow the instructions inside.

### 2. Add MCP server (if supported)

For native tool integration, also add to your MCP settings:

{
  "mcpServers": {
    "mermaid-viewer": {
      "url": "${BASE_URL}/mcp"
    }
  }
}

If you can't modify MCP settings, skip this — the skill file has everything you need to use the REST API directly.`;
}

export function AddToAgent({
  variant = "full",
}: {
  variant?: "full" | "button";
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prompt = getPrompt();

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  const previewText = `Follow the installation instructions in the README at github.com/mermaid-viewer/mermaid-viewer`;

  return (
    <div>
      {/*
        Concentric border radius:
          outer_r = inner_r + padding
          outer_r = 8 + 4 = 12px (rounded-xl)
          inner_r = 8px (rounded-lg)
          padding = 4px (p-1)
        Button shares inner_r = 8px
      */}
      <div
        className="relative overflow-hidden rounded-xl p-1 bg-gradient-to-br from-emerald-400/15 to-emerald-500/5"
        style={{
          boxShadow:
            "0 0 0 1px rgba(52, 211, 153, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.15), 0 2px 6px 0 rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Decorative rotated stripes */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 176,
            height: 40,
            left: 70,
            bottom: 120,
            background: "currentColor",
            opacity: 0.04,
            transform: "rotate(-130deg)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: 144,
            height: 16,
            left: 104,
            bottom: 144,
            background: "currentColor",
            opacity: 0.04,
            transform: "rotate(-130deg)",
          }}
        />

        {/* Content row — single inner bar with button inset */}
        <div className="relative flex items-center rounded-lg pl-3 pr-1 h-9 bg-gradient-to-br from-emerald-400/12 to-emerald-500/6">
          <span className="flex-1 min-w-0 block truncate font-mono text-sm leading-5 text-foreground/50">
            {previewText}
          </span>
          <button
            onClick={copy}
            className="shrink-0 ml-2 flex items-center gap-1.5 rounded-md px-2.5 h-7 text-xs font-medium bg-white/90 text-neutral-800 cursor-pointer transition-[background-color] duration-150 hover:bg-white"
          >
            {copied ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Subtitle — outside the card for clean spacing */}
      <p className="mt-2 text-xs text-muted-foreground">
        Paste into your agent&apos;s chat
      </p>

      <div className="mt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-[color] duration-150 cursor-pointer"
        >
          {expanded ? "Hide" : "View"} full prompt
          <ChevronDown
            className={`size-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {expanded && (
        <pre className="mt-3 text-xs font-mono leading-relaxed text-secondary-foreground border border-border rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
          {prompt}
        </pre>
      )}
    </div>
  );
}
