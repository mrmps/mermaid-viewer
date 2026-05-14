"use client";

import { useCallback, useState } from "react";
import { Bot, Check, ClipboardCopy } from "@/components/icons/mingcute";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/use-media-query";

function generateBoardPrompt({
  title,
  viewUrl,
  editUrl,
  apiUrl,
  editId,
}: {
  title: string;
  viewUrl: string;
  editUrl: string | null;
  apiUrl: string;
  editId?: string;
}) {
  if (!editUrl || !editId) {
    return `"${title}" — ${viewUrl}

Read workspace: GET ${apiUrl}`;
  }

  return `"${title}" — ${viewUrl}

This is the shared agent canvas. Keep related artifacts on this board.

Read workspace: GET ${apiUrl}
Add existing diagram: POST ${apiUrl} -H "Content-Type: application/json" -d '{"diagramId": "<diagram id>", "editId": "${editId}"}'
Create diagram on board: POST ${apiUrl} -H "Content-Type: application/json" -d '{"editId": "${editId}", "title": "Diagram name", "content": "flowchart TD\\n  A-->B"}'
Publish artifact: POST ${apiUrl} -H "Content-Type: application/json" -d '{"editId": "${editId}", "kind": "markdown", "title": "Decision log", "content": "# Decision log\\n\\n- Ship the mixed artifact canvas"}'
Publish website UI: POST ${apiUrl} -H "Content-Type: application/json" -d '{"editId": "${editId}", "kind": "website", "title": "Launch page", "ui": "<main><style>body{margin:0}</style><h1>Launch</h1></main>"}'
Publish slide deck: POST ${apiUrl} -H "Content-Type: application/json" -d '{"editId": "${editId}", "kind": "slides", "title": "Plan", "slides": [{"title": "Thesis", "body": "One sharp point"}, {"title": "Next", "bullets": ["A", "B"]}]}'
Update layout/style: PATCH ${apiUrl} -H "Content-Type: application/json" -d '{"editId": "${editId}", "state": <board state>}'
Edit in browser: ${editUrl}

Supported artifact kinds: diagram, website, slides, markdown, image, text.
Website cards accept sanitized HTML/CSS in \`ui\`; scripts, event handlers, unsafe URLs, external frames, and network fetches are blocked. Every card also gets its own item page URL.
Cards are placed without overlap by default. Only overlap cards when the user deliberately drags them there.`;
}

export function BoardShareButton({
  boardId,
  editId,
  title,
}: {
  boardId: string;
  editId?: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const viewUrl = `${origin}/b/${boardId}`;
  const editUrl = editId ? `${origin}/be/${editId}` : null;
  const apiUrl = `${origin}/api/b/${boardId}`;
  const content = (
    <BoardShareContent
      apiUrl={apiUrl}
      editId={editId}
      editUrl={editUrl}
      title={title}
      viewUrl={viewUrl}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          aria-label="Connect AI agent"
          className="gap-1.5"
          onClick={() => setOpen(true)}
          size="sm"
          title="Connect AI agent"
        >
          <Bot className="size-3.5" />
          <span className="hidden sm:inline">Connect AI agent</span>
          <span className="hidden min-[340px]:inline sm:hidden">Agent</span>
        </Button>
        <DialogPopup className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect AI agent</DialogTitle>
            <DialogDescription>
              Copy a workspace prompt for an AI agent or share direct links.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>{content}</DialogPanel>
        </DialogPopup>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Button
        aria-label="Connect AI agent"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        size="sm"
        title="Connect AI agent"
      >
        <Bot className="size-3.5" />
        <span className="hidden sm:inline">Connect AI agent</span>
        <span className="hidden min-[340px]:inline sm:hidden">Agent</span>
      </Button>
      <DrawerPopup showBar>
        <DrawerHeader>
          <DrawerTitle>Connect AI agent</DrawerTitle>
          <DrawerDescription>
            Copy a workspace prompt for an AI agent or share direct links.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel>{content}</DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}

function BoardShareContent({
  apiUrl,
  editId,
  editUrl,
  title,
  viewUrl,
}: {
  apiUrl: string;
  editId?: string;
  editUrl: string | null;
  title: string;
  viewUrl: string;
}) {
  const prompt = generateBoardPrompt({
    apiUrl,
    editId,
    editUrl,
    title,
    viewUrl,
  });

  return (
    <div className="space-y-5">
      <CopyInstructionsButton value={prompt} />

      <Block
        desc="Anyone with this link can view the workspace."
        label="View link"
      >
        <CopyRow value={viewUrl} />
      </Block>

      {editUrl ? (
        <Block
          desc="Anyone with this link can edit. Share carefully."
          label="Edit link"
        >
          <CopyRow value={editUrl} />
        </Block>
      ) : null}

      <details className="group">
        <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground transition-[color] duration-150 hover:text-foreground">
          Raw API access
        </summary>
        <div className="mt-3 space-y-3">
          <Block desc="Returns pages and artifact card state." label="Read">
            <CopyRow value={`curl ${apiUrl}`} />
          </Block>
          {editId ? (
            <Block desc="Adds an existing diagram to the board." label="Add">
              <CopyBlock
                value={`curl -X POST ${apiUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '{"diagramId": "DIAGRAM_ID", "editId": "${editId}"}'`}
              />
            </Block>
          ) : null}
          {editId ? (
            <Block desc="Creates a new Mermaid card on the board." label="Create">
              <CopyBlock
                value={`curl -X POST ${apiUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '{"editId": "${editId}", "title": "Diagram name", "content": "flowchart TD\\\\n  A-->B"}'`}
              />
            </Block>
          ) : null}
          {editId ? (
            <Block desc="Publishes a non-diagram artifact to the board." label="Publish artifact">
              <CopyBlock
                value={`curl -X POST ${apiUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '{"editId": "${editId}", "kind": "markdown", "title": "Decision log", "content": "# Decision log\\\\n\\\\n- Mixed artifact canvas"}'`}
              />
            </Block>
          ) : null}
          {editId ? (
            <Block desc="Publishes sanitized HTML/CSS in a sandboxed website card." label="Publish website UI">
              <CopyBlock
                value={`curl -X POST ${apiUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '{"editId": "${editId}", "kind": "website", "title": "Launch page", "ui": "<main><style>body{margin:0}</style><h1>Launch</h1></main>"}'`}
              />
            </Block>
          ) : null}
          {editId ? (
            <Block desc="Publishes a multi-slide presentation card." label="Publish slide deck">
              <CopyBlock
                value={`curl -X POST ${apiUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '{"editId": "${editId}", "kind": "slides", "title": "Plan", "slides": [{"title": "Thesis", "body": "One sharp point"}, {"title": "Next", "bullets": ["A", "B"]}]}'`}
              />
            </Block>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function Block({
  children,
  desc,
  label,
}: {
  children: React.ReactNode;
  desc: string;
  label: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mb-2 text-xs text-muted-foreground">{desc}</p>
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
      className="group flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted p-3 transition-[border-color] duration-150 hover:border-ring/40"
      onClick={copy}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          copy();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <pre className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
        {value}
      </pre>
      <span className="shrink-0 text-[10px] font-medium text-muted-foreground transition-[color] duration-150 group-hover:text-foreground">
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
    <section className="rounded-lg border border-foreground/10 bg-foreground/[0.035] p-3 ring-1 ring-foreground/5">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
          <Bot className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Agent handoff</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Copy one prompt with the workspace link, edit access, API calls, and
            non-overlap rule.
          </p>
        </div>
      </div>
      <Button
        className="w-full"
        onClick={copy}
      >
        {copied ? (
          <>
            <Check className="size-4" />
            Copied agent prompt
          </>
        ) : (
          <>
            <ClipboardCopy className="size-4" />
            Copy agent prompt
          </>
        )}
      </Button>
    </section>
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
    <button
      className="group relative w-full rounded-lg border border-border bg-muted p-3 text-left transition-[border-color] duration-150 hover:border-ring/40"
      onClick={copy}
      type="button"
    >
      <pre className="overflow-x-auto whitespace-pre-wrap pr-12 font-mono text-xs leading-relaxed text-muted-foreground">
        {value}
      </pre>
      <span className="absolute right-2 top-2 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground opacity-0 shadow-sm transition-[opacity,color] duration-150 group-hover:opacity-100 group-hover:text-foreground">
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
