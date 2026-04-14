"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeHistoryEntry } from "@/components/history-tracker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/use-media-query";

export function DeleteDiagramButton({
  diagramId,
  editId,
  title,
}: {
  diagramId: string;
  editId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 640px)");

  async function onDelete() {
    if (deleting) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/d/${diagramId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ editId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete diagram");
      }

      removeHistoryEntry(diagramId);
      router.replace("/diagrams");
      router.refresh();
    } catch (err) {
      setDeleting(false);
      setError(
        err instanceof Error ? err.message : "Failed to delete diagram"
      );
    }
  }

  const content = (
    <>
      <div className="space-y-3 px-4 pb-4">
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-medium text-foreground">{title}</span> and
          all of its saved versions. This cannot be undone.
        </p>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
      <DeleteActions
        deleting={deleting}
        onCancel={() => {
          if (deleting) return;
          setOpen(false);
          setError(null);
        }}
        onDelete={onDelete}
      />
    </>
  );

  const trigger = (
    <Button
      variant="destructive"
      size="sm"
      className="gap-1.5"
      onClick={() => {
        setError(null);
        setOpen(true);
      }}
    >
      <Trash2 className="size-3.5" />
      Delete
    </Button>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger}
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete diagram?</DialogTitle>
            <DialogDescription>
              This permanently removes the chart and its version history.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {trigger}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Delete diagram?</DrawerTitle>
          <DrawerDescription>
            This permanently removes the chart and its version history.
          </DrawerDescription>
        </DrawerHeader>
        {content}
      </DrawerContent>
    </Drawer>
  );
}

function DeleteActions({
  deleting,
  onCancel,
  onDelete,
}: {
  deleting: boolean;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <DialogFooter className="hidden sm:flex">
        <Button variant="outline" onClick={onCancel} disabled={deleting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onDelete} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete diagram"}
        </Button>
      </DialogFooter>
      <DrawerFooter className="sm:hidden">
        <Button variant="destructive" onClick={onDelete} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete diagram"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={deleting}>
          Cancel
        </Button>
      </DrawerFooter>
    </>
  );
}
