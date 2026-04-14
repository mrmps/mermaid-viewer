"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSourcePanel } from "./diagram-layout";
import { Button } from "@/components/ui/button";
import { Code, Copy, Check, Save, X } from "lucide-react";

export function SourceToggle() {
  const { toggle } = useSourcePanel();
  return (
    <button
      onClick={toggle}
      className="px-3 min-h-[40px] text-xs font-medium rounded-md transition-[background-color] duration-150 cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80"
    >
      Source
    </button>
  );
}

export function SourcePanel({
  content,
  diagramId,
  editId,
}: {
  content: string;
  diagramId: string;
  editId?: string;
}) {
  const { open, toggle } = useSourcePanel();
  const [source, setSource] = useState(content);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sync source when content prop changes (version switch)
  useEffect(() => {
    setSource(content);
  }, [content]);

  const hasChanges = source !== content;

  const copySource = useCallback(async () => {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [source]);

  const saveSource = useCallback(async () => {
    if (!editId || !hasChanges) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/d/${diagramId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: source, editId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save");
      }

      const data = await res.json();

      // Navigate to the new version on the edit URL
      const params = new URLSearchParams(searchParams.toString());
      params.set("v", String(data.version));
      router.push(`/e/${editId}?${params.toString()}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [source, editId, diagramId, hasChanges, searchParams, router]);

  if (!open) return null;

  return (
    <div className="w-96 shrink-0 flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Code className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Source
          </span>
        </div>
        <button
          onClick={toggle}
          className="size-10 flex items-center justify-center rounded-md transition-[background-color,color] duration-150 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 p-3">
        <textarea
          ref={textareaRef}
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setError(null);
          }}
          spellCheck={false}
          className="w-full h-full resize-none rounded-lg p-3 text-xs font-mono bg-muted text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          placeholder="Enter mermaid diagram source..."
          readOnly={!editId}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 px-3 py-2 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/30">
          {error}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          onClick={copySource}
          className="gap-1.5"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>

        {editId && (
          <Button
            size="sm"
            onClick={saveSource}
            disabled={!hasChanges || saving}
            className="gap-1.5"
          >
            <Save className="size-3" />
            {saving ? "Saving..." : "Save"}
          </Button>
        )}

        {hasChanges && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}
