"use client";

import { useState, useCallback } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { Share2, Check, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

function generateCollabPrompt({
  title,
  viewUrl,
  editUrl,
  apiUrl,
  secret,
}: {
  title: string;
  viewUrl: string;
  editUrl: string;
  apiUrl: string;
  secret: string;
  mcpUrl: string;
}) {
  return `"${title}" — ${viewUrl}

Read: GET ${apiUrl}
Update: PUT ${apiUrl} -H "Authorization: Bearer ${secret}" -H "Content-Type: text/plain" -d '<mermaid source>'
Edit in browser: ${editUrl}

Updates create new versions — nothing is overwritten.`;
}

export function ShareButton({
  diagramId,
  editId,
  secret,
  title,
}: {
  diagramId: string;
  editId?: string;
  secret?: string;
  title: string;
  content: string;
  version: number;
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const viewUrl = `${origin}/d/${diagramId}`;
  const editUrl = editId ? `${origin}/e/${editId}` : null;
  const apiUrl = `${origin}/api/d/${diagramId}`;
  const mcpUrl = `${origin}/mcp`;

  const contentEl = (
    <ShareContent
      viewUrl={viewUrl}
      editUrl={editUrl}
      apiUrl={apiUrl}
      mcpUrl={mcpUrl}
      secret={secret}
      title={title}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Share2 className="size-3.5" />
          Share
        </Button>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share</DialogTitle>
            <DialogDescription>
              Share this diagram or invite a collaborator.
            </DialogDescription>
          </DialogHeader>
          {contentEl}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Share2 className="size-3.5" />
        Share
      </Button>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Share</DrawerTitle>
          <DrawerDescription>
            Share this diagram or invite a collaborator.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6">{contentEl}</div>
      </DrawerContent>
    </Drawer>
  );
}

function ShareContent({
  viewUrl,
  editUrl,
  apiUrl,
  mcpUrl,
  secret,
  title,
}: {
  viewUrl: string;
  editUrl: string | null;
  apiUrl: string;
  mcpUrl: string;
  secret?: string;
  title: string;
}) {
  const canEdit = !!editUrl && !!secret;
  const collabPrompt = canEdit
    ? generateCollabPrompt({ title, viewUrl, editUrl, apiUrl, secret, mcpUrl })
    : null;

  return (
    <div className="space-y-5">
      {/* View link — always visible */}
      <Block label="View link" desc="Anyone with this link can view the diagram.">
        <CopyRow value={viewUrl} />
      </Block>

      {/* Edit link — only when user has edit access */}
      {editUrl && (
        <Block
          label="Edit link"
          desc="Anyone with this link can edit. Share carefully."
        >
          <CopyRow value={editUrl} />
        </Block>
      )}

      {/* Copy edit instructions — only with edit access */}
      {collabPrompt && (
        <CopyInstructionsButton value={collabPrompt} />
      )}

      {/* View-only badge */}
      {!editUrl && (
        <div className="flex items-center gap-2 rounded-lg p-3 text-xs leading-relaxed text-muted-foreground bg-muted border border-border">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3.5 shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            View only. Ask the diagram owner for an edit link to contribute.
          </span>
        </div>
      )}

      {/* Advanced — raw API */}
      <details className="group">
        <summary className="text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-[color] duration-150">
          Raw API access
        </summary>
        <div className="space-y-3 mt-3">
          <Block label="Read" desc="Returns all versions with content as JSON.">
            <CopyRow value={`curl ${apiUrl}`} />
          </Block>
          {secret && (
            <>
              <Block label="Update" desc="Creates a new version.">
                <CopyBlock
                  value={`curl -X PUT ${apiUrl} \\\n  -H "Authorization: Bearer ${secret}" \\\n  -H "Content-Type: text/plain" \\\n  -d 'YOUR_MERMAID_CONTENT'`}
                />
              </Block>
              <Block label="Delete" desc="Permanently removes the diagram and all versions.">
                <CopyBlock
                  value={`curl -X DELETE ${apiUrl} \\\n  -H "Authorization: Bearer ${secret}"`}
                />
              </Block>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function Block({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mb-2">{desc}</p>
      {children}
    </div>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={copy}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copy(); } }}
      className="flex items-center gap-2 rounded-lg p-3 bg-muted border border-border cursor-pointer group hover:border-ring/40 transition-[border-color] duration-150"
    >
      <pre className="flex-1 min-w-0 text-xs font-mono text-muted-foreground truncate">
        {value}
      </pre>
      <span className="shrink-0 text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-[color] duration-150">
        {copied ? "Copied!" : "Copy"}
      </span>
    </div>
  );
}

function CopyInstructionsButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <button
      onClick={copy}
      className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium cursor-pointer border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-[background-color] duration-150"
    >
      {copied ? (
        <>
          <Check className="size-4" />
          Copied!
        </>
      ) : (
        <>
          <ClipboardCopy className="size-4" />
          Copy edit instructions
        </>
      )}
    </button>
  );
}

function CopyBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={copy}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copy(); } }}
      className="relative rounded-lg border border-border bg-muted cursor-pointer group hover:border-ring/40 transition-[border-color] duration-150"
    >
      <pre className="p-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
        {value}
      </pre>
      <span className="absolute top-2 right-2 text-[10px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-[opacity,color] duration-150 bg-background border border-border rounded-md px-2 py-1 shadow-sm">
        {copied ? "Copied!" : "Copy"}
      </span>
    </div>
  );
}
