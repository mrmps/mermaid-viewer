"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Brush,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  ImageIcon,
  Presentation,
  StickyNote,
  Type,
} from "@/components/icons/mingcute";
import { MermaidPreview } from "@/components/mermaid-preview";
import { SanitizedUiFrame } from "@/components/sanitized-ui-frame";
import {
  SlideArtifactFrame,
  slidesForItem,
} from "@/components/slide-artifact-frame";
import { Button } from "@/components/ui/button";
import { MarkdownReport } from "@/components/markdown-report";
import type { BoardItem, BoardItemKind } from "@/lib/board-state";
import { hasHtmlContent } from "@/lib/sanitized-ui";

function getKindLabel(kind: BoardItemKind | undefined) {
  switch (kind ?? "diagram") {
    case "diagram":
      return "Diagram";
    case "website":
      return "Website";
    case "slides":
      return "Slides";
    case "markdown":
      return "Markdown";
    case "image":
      return "Image";
    case "text":
      return "Text";
    case "drawing":
      return "Drawing";
  }
}

function getKindIcon(kind: BoardItemKind | undefined) {
  switch (kind ?? "diagram") {
    case "diagram":
      return <FileText className="size-4" />;
    case "website":
      return <Globe2 className="size-4" />;
    case "slides":
      return <Presentation className="size-4" />;
    case "markdown":
      return <FileText className="size-4" />;
    case "image":
      return <ImageIcon className="size-4" />;
    case "text":
      return <Type className="size-4" />;
    case "drawing":
      return <Brush className="size-4" />;
  }
}

function parseDrawingContent(content: string): number[][][] {
  try {
    const value = JSON.parse(content);
    if (!Array.isArray(value)) return [];
    return value
      .filter(Array.isArray)
      .map((stroke) =>
        stroke
          .filter(
            (point: unknown): point is [number, number] =>
              Array.isArray(point) &&
              typeof point[0] === "number" &&
              typeof point[1] === "number"
          )
          .map((point: [number, number]) => [point[0], point[1]])
      )
      .filter((stroke) => stroke.length > 0);
  } catch {
    return [];
  }
}

export function BoardItemPage({
  boardHref,
  boardTitle,
  editHref,
  item,
  pageName,
}: {
  boardHref: string;
  boardTitle: string;
  editHref?: string;
  item: BoardItem;
  pageName: string;
}) {
  const kind = item.kind ?? "diagram";
  const externalHref =
    kind === "website" ? item.url : kind === "diagram" ? item.href : undefined;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/96 px-3 backdrop-blur md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="Back to board"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.96]"
            href={boardHref}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <span className="min-w-0 truncate">{item.title}</span>
              <span className="linear-item-chip hidden shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase sm:inline-flex">
                {getKindIcon(kind)}
                {getKindLabel(kind)}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {boardTitle} / {pageName}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {externalHref ? (
            <Button
              aria-label="Open source"
              render={<a href={externalHref} rel="noreferrer" target="_blank" />}
              size="icon-sm"
              title="Open source"
              variant="ghost"
            >
              <ExternalLink />
            </Button>
          ) : null}
          {editHref ? (
            <Button
              render={<Link href={editHref} />}
              size="sm"
              variant="secondary"
            >
              Edit board
            </Button>
          ) : null}
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <ItemStage item={item} />
      </main>
    </div>
  );
}

function ItemStage({ item }: { item: BoardItem }) {
  const kind = item.kind ?? "diagram";

  if (kind === "diagram") {
    return (
      <div className="h-[calc(100dvh-3.5rem)] bg-white p-3">
        <MermaidPreview
          content={item.content}
          look={item.look}
          renderer={item.renderer}
          theme={item.theme}
          uiMode="light"
        />
      </div>
    );
  }

  if (kind === "website") return <WebsiteStage item={item} />;
  if (kind === "slides") return <SlideDeckStage item={item} />;
  if (kind === "image") return <ImageStage item={item} />;
  if (kind === "drawing") return <DrawingStage item={item} />;
  if (kind === "markdown") return <MarkdownStage item={item} />;

  return <TextStage item={item} />;
}

function WebsiteStage({ item }: { item: BoardItem }) {
  if (hasHtmlContent(item.content)) {
    return (
      <SanitizedUiFrame
        className="h-[calc(100dvh-3.5rem)] w-full border-0 bg-white"
        content={item.content}
        title={item.title}
      />
    );
  }

  return (
    <div className="grid h-[calc(100dvh-3.5rem)] place-items-center bg-[#f7f7f5] px-6 text-zinc-950">
      <section className="linear-item-card w-full max-w-4xl rounded-lg border p-6 md:p-10">
        <div
          className="mb-6 h-1 w-16 rounded-full"
          style={{ backgroundColor: item.accent ?? "#18181b" }}
        />
        <p className="text-sm font-semibold uppercase text-zinc-500">
          {item.url ?? "draft.local"}
        </p>
        <h1 className="mt-4 text-5xl font-semibold leading-none md:text-7xl">
          {item.title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
          {item.content}
        </p>
      </section>
    </div>
  );
}

function SlideDeckStage({ item }: { item: BoardItem }) {
  const slides = useMemo(() => slidesForItem(item), [item]);
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];
  const accent = slide.accent ?? item.accent ?? "#1f6397";

  const move = useCallback((delta: number) => {
    setIndex((current) => (current + delta + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "PageDown") move(1);
      if (event.key === "ArrowLeft" || event.key === "PageUp") move(-1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] bg-[#090a0c] text-white lg:grid-cols-[1fr_18rem]">
      <section className="relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden p-4 md:p-10">
        <SlideArtifactFrame
          accent={accent}
          deckTitle={item.title}
          index={index}
          slide={slide}
          slideCount={slides.length}
        />

        {slides.length > 1 ? (
          <div className="absolute inset-x-4 bottom-4 flex justify-between md:inset-x-8 md:bottom-8">
            <Button
              aria-label="Previous slide"
              onClick={() => move(-1)}
              size="icon-lg"
              variant="secondary"
            >
              <ChevronLeft />
            </Button>
            <Button
              aria-label="Next slide"
              onClick={() => move(1)}
              size="icon-lg"
              variant="secondary"
            >
              <ChevronRight />
            </Button>
          </div>
        ) : null}
      </section>

      <aside className="hidden border-l border-white/10 bg-[#0d0e11] p-3 lg:block">
        <div className="grid gap-2">
          {slides.map((candidate, candidateIndex) => (
            <button
              aria-pressed={candidateIndex === index}
              className={`rounded-md border p-3 text-left transition ${
                candidateIndex === index
                  ? "border-white/30 bg-white/12 text-white"
                  : "border-white/10 bg-white/[0.035] text-white/62 hover:bg-white/[0.08] hover:text-white"
              }`}
              key={`${candidate.title}-${candidateIndex}`}
              onClick={() => setIndex(candidateIndex)}
              type="button"
            >
              <p className="mb-2 text-[0.65rem] font-semibold uppercase opacity-55">
                {`${candidateIndex + 1}`.padStart(2, "0")}
              </p>
              <p className="line-clamp-2 text-sm font-semibold">
                {candidate.title}
              </p>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function MarkdownStage({ item }: { item: BoardItem }) {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#f2eee8] p-3 md:p-7">
      <MarkdownReport
        className="mx-auto min-h-[calc(100dvh-5rem)] max-w-6xl"
        content={item.content}
        title={item.title}
      />
    </div>
  );
}

function ImageStage({ item }: { item: BoardItem }) {
  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] bg-zinc-950 text-white">
      <div
        aria-label={item.imageUrl ? item.title : undefined}
        className="absolute inset-0 bg-cover bg-center"
        role={item.imageUrl ? "img" : undefined}
        style={{
          backgroundColor: item.imageUrl ? undefined : (item.accent ?? "#18181b"),
          backgroundImage: item.imageUrl ? `url("${item.imageUrl}")` : undefined,
        }}
      />
      <div className="absolute inset-x-0 bottom-0 bg-zinc-950/84 p-6 md:p-10">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight">
          {item.title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white/72">
          {item.content}
        </p>
      </div>
    </div>
  );
}

function DrawingStage({ item }: { item: BoardItem }) {
  const strokes = parseDrawingContent(item.content);

  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] place-items-center bg-[#fbfaf6] p-5">
      <svg
        aria-label={item.title}
        className="h-full max-h-[calc(100dvh-7rem)] w-full max-w-6xl rounded-lg border border-zinc-200 bg-[#fbfaf6] shadow-sm"
        role="img"
        viewBox="0 0 1000 600"
      >
        <defs>
          <pattern height="40" id="item-drawing-grid" patternUnits="userSpaceOnUse" width="40">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e7e5df" strokeWidth="1" />
          </pattern>
        </defs>
        <rect fill="url(#item-drawing-grid)" height="600" width="1000" />
        {strokes.map((stroke, index) => (
          <polyline
            fill="none"
            key={`${index}-${stroke.length}`}
            points={stroke.map((point) => point.join(",")).join(" ")}
            stroke="#18181b"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="8"
          />
        ))}
      </svg>
    </div>
  );
}

function TextStage({ item }: { item: BoardItem }) {
  return (
    <div
      className="grid min-h-[calc(100dvh-3.5rem)] place-items-center p-6 text-zinc-950"
      style={{
        backgroundColor: item.accent ?? "#fde68a",
      }}
    >
      <section className="w-full max-w-3xl rounded-lg border border-zinc-950/10 bg-white/55 p-8 shadow-sm">
        <StickyNote className="mb-8 size-10 opacity-45" />
        <p className="text-4xl font-semibold leading-tight md:text-6xl">
          {item.content}
        </p>
        <p className="mt-8 text-sm font-bold uppercase text-zinc-700/60">
          {item.author ?? "Team note"}
        </p>
      </section>
    </div>
  );
}
