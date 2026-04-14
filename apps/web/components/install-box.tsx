"use client";

import { useState, useCallback } from "react";

type Tab = "cli" | "agent";

const commands: Record<Tab, string> = {
  cli: "npm i -g mermaidsh",
  agent: "curl -sL mermaidsh.com/install.md | claude",
};

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      width="12"
      height="12"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.25 2.25C3.25 1.698 3.698 1.25 4.25 1.25H9.25C10.079 1.25 10.75 1.922 10.75 2.75V7.75C10.75 8.302 10.302 8.75 9.75 8.75C9.474 8.75 9.25 8.526 9.25 8.25C9.25 7.974 9.474 7.75 9.75 7.75V2.75C9.75 2.474 9.526 2.25 9.25 2.25H4.25C4.25 2.526 4.026 2.75 3.75 2.75C3.474 2.75 3.25 2.526 3.25 2.25ZM1.25 4.75C1.25 3.922 1.922 3.25 2.75 3.25H7.25C8.078 3.25 8.75 3.922 8.75 4.75V9.25C8.75 10.079 8.078 10.75 7.25 10.75H2.75C1.922 10.75 1.25 10.079 1.25 9.25V4.75ZM2.75 4.25C2.474 4.25 2.25 4.474 2.25 4.75V9.25C2.25 9.526 2.474 9.75 2.75 9.75H7.25C7.526 9.75 7.75 9.526 7.75 9.25V4.75C7.75 4.474 7.526 4.25 7.25 4.25H2.75Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      width="12"
      height="12"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10.28 2.72a.75.75 0 010 1.06l-5.5 5.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 111.06-1.06L4.25 7.69l4.97-4.97a.75.75 0 011.06 0z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function InstallBox() {
  const [tab, setTab] = useState<Tab>("cli");
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(commands[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tab]);

  return (
    <div className="max-w-[451px]">
      {/* Card */}
      <div
        className="flex flex-col gap-5 rounded-[14px] px-[15px] pt-[10px] pb-[14px] cursor-text"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-card) 45.83%, var(--color-secondary) 46.26%)",
          boxShadow:
            "rgba(0,0,0,0.06) 0 0 0 1px, rgba(0,0,0,0.06) 0 1px 2px -1px, rgba(0,0,0,0.04) 0 2px 4px 0",
        }}
      >
        {/* Tabs */}
        <div className="flex items-start gap-[14px]">
          <button
            type="button"
            onClick={() => setTab("cli")}
            className="cursor-pointer"
          >
            <span
              className="block text-[16px] font-medium leading-[23px]"
              style={{
                color:
                  tab === "cli"
                    ? "var(--color-foreground)"
                    : "var(--color-muted-foreground)",
              }}
            >
              cli
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("agent")}
            className="cursor-pointer"
          >
            <span
              className="block text-[16px] font-medium leading-[23px] shrink-0"
              style={{
                color:
                  tab === "agent"
                    ? "var(--color-foreground)"
                    : "var(--color-muted-foreground)",
              }}
            >
              agent prompt
            </span>
          </button>
        </div>

        {/* Command row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[11px] min-w-0">
            <span className="shrink-0 text-[16px] font-medium leading-[23px] text-muted-foreground">
              $
            </span>
            <span className="text-[16px] font-medium leading-[23px] text-foreground/80 truncate min-w-0">
              {commands[tab]}
            </span>
          </div>
          <button
            type="button"
            aria-label="Copy command"
            onClick={copy}
            className="shrink-0 flex items-center justify-center w-5 h-5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            {copied ? (
              <CheckIcon className="w-5 h-5" />
            ) : (
              <CopyIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
