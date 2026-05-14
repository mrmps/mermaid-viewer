"use client";

import { useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/icons/mingcute";

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
          <Button
            aria-label="Open in Excalidraw"
            variant="outline"
            size="sm"
            onClick={openInExcalidraw}
          >
            <ExternalLink data-icon="inline-start" />
            <span className="hidden min-[520px]:inline">
              {copied ? "Copied! Paste ⌘⇧M" : "Excalidraw"}
            </span>
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
