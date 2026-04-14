"use client";

import { useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Button } from "@/components/ui/button";

export function ExcalidrawButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  async function openInExcalidraw() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.open("https://excalidraw.com/", "_blank");
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button variant="outline" size="sm" onClick={openInExcalidraw}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-icon="inline-start">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {copied ? "Copied! Paste ⌘⇧M" : "Excalidraw"}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="px-3 py-2 text-xs rounded-md bg-secondary text-secondary-foreground border border-border"
          >
            Copies diagram to clipboard — paste in Excalidraw with ⌘⇧M
            <Tooltip.Arrow className="fill-secondary" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
