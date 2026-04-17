"use client";

import { useMemo, useState } from "react";
import { baseUrl } from "@/lib/env";
import { CopyBlock } from "@/components/copy-block";

type TabId = "cursor" | "claude" | "codex" | "manual";

const TABS: { id: TabId; label: string }[] = [
  { id: "cursor", label: "Cursor" },
  { id: "claude", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "manual", label: "Manual" },
];

const SERVER_NAME = "mermaid-viewer";

function toBase64(value: string) {
  if (typeof window === "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  return window.btoa(value);
}

export function McpInstallTabs() {
  const [active, setActive] = useState<TabId>("cursor");

  const mcpUrl = `${baseUrl}/mcp`;

  const cursorDeepLink = useMemo(() => {
    const config = toBase64(JSON.stringify({ url: mcpUrl }));
    return `cursor://anysphere.cursor-deeplink/mcp/install?name=${SERVER_NAME}&config=${config}`;
  }, [mcpUrl]);

  const manualJson = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            [SERVER_NAME]: { url: mcpUrl },
          },
        },
        null,
        2,
      ),
    [mcpUrl],
  );

  const mcpRemoteJson = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            [SERVER_NAME]: {
              command: "npx",
              args: ["mcp-remote", mcpUrl],
            },
          },
        },
        null,
        2,
      ),
    [mcpUrl],
  );

  return (
    <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="MCP install method"
        className="flex border-b border-border bg-muted/30 px-1 pt-1 gap-0.5 overflow-x-auto"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`mcp-panel-${tab.id}`}
              id={`mcp-tab-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={`relative px-3 h-8 text-xs font-medium rounded-t-md cursor-pointer transition-[color,background-color] duration-150 ${
                selected
                  ? "bg-background text-foreground shadow-[0_1px_0_0_var(--color-background)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="p-4">
        {active === "cursor" && (
          <div
            role="tabpanel"
            id="mcp-panel-cursor"
            aria-labelledby="mcp-tab-cursor"
            className="flex flex-col gap-3"
          >
            <a
              href={cursorDeepLink}
              className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-[background-color] duration-150 w-fit"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                <path d="M11.925 24l10.425-6.01V5.974L11.925 0 1.5 5.974v12.016L11.925 24zm0-2.32L3.52 16.84V7.158l8.405 4.84v9.681zm.42-9.681l8.405-4.84v9.682l-8.405 4.84v-9.682z" />
              </svg>
              Add to Cursor
            </a>
            <p className="text-xs text-muted-foreground">
              Opens Cursor and installs the <code className="font-mono">{SERVER_NAME}</code> MCP server. Or add it manually:
            </p>
            <CopyBlock text={manualJson} />
          </div>
        )}

        {active === "claude" && (
          <div
            role="tabpanel"
            id="mcp-panel-claude"
            aria-labelledby="mcp-tab-claude"
            className="flex flex-col gap-3"
          >
            <p className="text-sm text-secondary-foreground">
              Run this in your terminal to register the server:
            </p>
            <CopyBlock
              prompt
              text={`claude mcp add --transport http ${SERVER_NAME} ${mcpUrl}`}
            />
            <p className="text-xs text-muted-foreground">
              Verify with <code className="font-mono">claude mcp list</code> or{" "}
              <code className="font-mono">/mcp</code> inside Claude Code.
            </p>
          </div>
        )}

        {active === "codex" && (
          <div
            role="tabpanel"
            id="mcp-panel-codex"
            aria-labelledby="mcp-tab-codex"
            className="flex flex-col gap-3"
          >
            <p className="text-sm text-secondary-foreground">
              Run this in your terminal to register the server:
            </p>
            <CopyBlock prompt text={`codex mcp add ${SERVER_NAME} --url ${mcpUrl}`} />
            <p className="text-xs text-muted-foreground">
              Verify with <code className="font-mono">codex mcp list</code>.
            </p>
          </div>
        )}

        {active === "manual" && (
          <div
            role="tabpanel"
            id="mcp-panel-manual"
            aria-labelledby="mcp-tab-manual"
            className="flex flex-col gap-3"
          >
            <p className="text-sm text-secondary-foreground">
              Server URL: <code className="font-mono text-foreground">{mcpUrl}</code>
            </p>
            <CopyBlock text={manualJson} />
            <p className="text-xs text-muted-foreground">
              If your client doesn&apos;t support remote HTTP MCP natively, use the{" "}
              <code className="font-mono">mcp-remote</code> bridge (requires Node.js):
            </p>
            <CopyBlock text={mcpRemoteJson} />
          </div>
        )}
      </div>
    </div>
  );
}
