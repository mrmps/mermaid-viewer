"use client";

import { useRouter } from "next/navigation";
import * as Tooltip from "@radix-ui/react-tooltip";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BoardButton({
  diagramId,
  title,
}: {
  diagramId: string;
  title: string;
}) {
  const router = useRouter();

  async function openBoard() {
    const response = await fetch("/api/b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, diagramId }),
    });

    if (!response.ok) return;

    const board = (await response.json()) as { editId: string };
    router.push(`/be/${board.editId}`);
  }

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button
            aria-label="Add to board"
            onClick={() => void openBoard()}
            size="sm"
            variant="outline"
          >
            <LayoutDashboard data-icon="inline-start" />
            <span className="hidden sm:inline">Board</span>
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="rounded-md border border-border bg-secondary px-3 py-2 text-xs text-secondary-foreground"
            sideOffset={6}
          >
            Add this diagram to the board
            <Tooltip.Arrow className="fill-secondary" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
