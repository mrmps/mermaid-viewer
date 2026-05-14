"use client";

import { code } from "@streamdown/code";
import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import {
  Check,
  Copy,
  Download,
  FileText,
  Maximize2,
} from "@/components/icons/mingcute";
import { markdownDownloadFilename } from "@/lib/markdown-document";
import { cn } from "@/lib/utils";

export function MarkdownReport({
  canEditTitle = false,
  className,
  content,
  href,
  onTitleChange,
  preview = false,
  title,
}: {
  canEditTitle?: boolean;
  className?: string;
  content: string;
  href?: string;
  onTitleChange?: (title: string) => void;
  preview?: boolean;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const filename = useMemo(() => markdownDownloadFilename(title), [title]);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadMarkdown() {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      className={cn(
        "markdown-report flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-[#fffdf9] text-[#2a2520]",
        preview ? "shadow-sm" : "shadow-xl shadow-zinc-950/[0.06]",
        className
      )}
    >
      <header className="flex h-15 shrink-0 items-center gap-3 border-b border-[#e4dfd8] bg-[#fffdf9] px-4 md:px-5">
        <FileText className="size-5 shrink-0 text-[#151515]" />
        {canEditTitle ? (
          <input
            aria-label="Markdown title"
            className="min-w-0 flex-1 select-text bg-transparent text-[1.03rem] font-semibold text-[#0f0f0f] outline-none md:text-[1.12rem]"
            data-board-control
            defaultValue={title}
            key={title}
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next && next !== title) onTitleChange?.(next);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                event.currentTarget.value = title;
                event.currentTarget.blur();
              }
            }}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-[1.03rem] font-semibold text-[#0f0f0f] md:text-[1.12rem]">
            {title}
          </span>
        )}

        <div className="flex shrink-0 items-center gap-1.5" data-board-control>
          <button
            aria-label={copied ? "Copied markdown" : "Copy markdown"}
            className="inline-flex size-8 items-center justify-center rounded-md text-[#6f6a64] hover:bg-[#f0ece6] hover:text-[#22201d] active:scale-[0.96]"
            onClick={() => void copyMarkdown()}
            title={copied ? "Copied" : "Copy markdown"}
            type="button"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
          {href ? (
            <a
              aria-label="Open full report"
              className="inline-flex size-8 items-center justify-center rounded-md text-[#6f6a64] hover:bg-[#f0ece6] hover:text-[#22201d] active:scale-[0.96]"
              href={href}
              rel="noreferrer"
              target="_blank"
              title="Open full report"
            >
              <Maximize2 className="size-4" />
            </a>
          ) : null}
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ddd8d0] bg-[#fffdf9] px-3 text-[0.95rem] font-medium text-[#302c27] shadow-sm shadow-zinc-950/[0.03] hover:bg-[#f7f3ed] active:scale-[0.98]"
            onClick={downloadMarkdown}
            title="Download markdown"
            type="button"
          >
            <Download className="size-4" />
            <span className={preview ? "hidden sm:inline" : ""}>Download</span>
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          className={cn(
            "h-full",
            preview ? "overflow-hidden" : "overflow-auto"
          )}
        >
          <article
            className={cn(
              "markdown-report-page mx-auto min-h-full max-w-[58rem] px-5 py-7 md:px-9 md:py-9",
              preview ? "pb-24" : "pb-16"
            )}
          >
            <Streamdown
              className="markdown-report-body"
              controls={false}
              mode="static"
              plugins={{ code }}
            >
              {content}
            </Streamdown>
          </article>
        </div>

        {preview && href ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#fffdf9] via-[#fffdf9]/95 to-transparent px-4 pb-4 pt-20">
            <a
              className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-lg border border-[#dcd6ce] bg-[#fffdf9] px-4 text-[1rem] font-medium text-[#302c27] shadow-lg shadow-zinc-950/[0.06] hover:bg-[#f7f3ed] active:scale-[0.98]"
              data-board-control
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              <Maximize2 className="size-4" />
              Show full report
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
