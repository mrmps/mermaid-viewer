"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";

export const INITIAL_CHAT_KEY = "mermaid-viewer-initial-chat";

export function CreateChat() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const handleSubmit = useCallback(async () => {
    const message = input.trim();
    if (!message || loading) return;

    setLoading(true);

    try {
      const res = await fetch("/api/d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "graph TD\n    A[Start]",
          title: "Untitled",
        }),
      });

      if (!res.ok) throw new Error("Failed to create diagram");
      const data = await res.json();

      sessionStorage.setItem(INITIAL_CHAT_KEY, message);
      router.push(`/e/${data.editId}?chat=true`);
    } catch {
      setLoading(false);
    }
  }, [input, loading, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  return (
    <div
      className="relative w-full cursor-text"
      onClick={() => textareaRef.current?.focus()}
    >
      {/* Gradient border overlay */}
      <div className="absolute inset-[-0.5px] rounded-[11px] bg-gradient-to-b from-border to-border/40 pointer-events-none" />

      <div
        className={cn(
          "relative flex rounded-[10px] bg-card overflow-hidden",
          "shadow-[0_4px_4px_-1px_rgba(0,0,0,0.04),0_1px_1px_rgba(0,0,0,0.08)]",
          "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.4)]"
        )}
      >
        <div className="flex flex-col flex-1 gap-2 p-3">
          <div className="flex flex-1 w-full px-1.5 py-0.5 min-h-[48px] max-h-[288px] overflow-y-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe a diagram..."
              rows={1}
              disabled={loading}
              className={cn(
                "w-full resize-none bg-transparent border-none",
                "text-[15px] font-[450] leading-6 tracking-[-0.1px]",
                "text-foreground/90 placeholder:text-muted-foreground/40 dark:placeholder:text-muted-foreground/60",
                "focus:outline-none disabled:opacity-50"
              )}
              style={{ minHeight: "24px", maxHeight: "200px" }}
            />
          </div>

          <div className="flex items-end justify-between w-full">
            <span className="flex items-center gap-1 select-none px-0.5 leading-6">
              <span className="flex items-center gap-0.5">
                <Kbd>{typeof navigator !== "undefined" && navigator?.platform?.includes("Mac") ? "⌘" : "Ctrl"}</Kbd>
                <Kbd>↵</Kbd>
              </span>
              <span className="text-[11px] text-muted-foreground">to send</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
                aria-label="Create diagram"
                className={cn(
                  "size-6 flex items-center justify-center rounded-full shrink-0 relative",
                  "border border-border/50",
                  "transition-all duration-150",
                  input.trim() && !loading
                    ? "bg-muted text-foreground/90 cursor-pointer hover:bg-muted/80 shadow-[0_0_0_0.5px_rgba(255,255,255,0.14),0_4px_4px_-1px_rgba(0,0,0,0.04),0_1px_1px_rgba(0,0,0,0.08)] dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/80"
                    : "bg-muted/30 text-muted-foreground pointer-events-none opacity-40"
                )}
              >
                {loading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <ArrowUp className="size-3.5" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
