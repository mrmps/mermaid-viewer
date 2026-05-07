"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function CreateBoardRedirect({
  title = "Untitled workspace",
}: {
  title?: string;
}) {
  const router = useRouter();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    fetch("/api/b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return response.json() as Promise<{ editId: string }>;
      })
      .then((board) => router.replace(`/be/${board.editId}`))
      .catch(() => setError("Failed to create board"));
  }, [router, title]);

  return (
    <div className="flex h-dvh items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        {error ?? "Creating workspace..."}
      </div>
    </div>
  );
}
