"use client";

import type { CSSProperties } from "react";
import type { BoardItem, BoardSlide } from "@/lib/board-state";
import { cn } from "@/lib/utils";

export function slidesForItem(item: Pick<BoardItem, "content" | "slides" | "title">): BoardSlide[] {
  if (item.slides && item.slides.length > 0) return item.slides;

  return [
    {
      eyebrow: "01",
      title: item.title,
      body: item.content,
    },
  ];
}

export function SlideArtifactFrame({
  accent,
  className,
  deckTitle,
  index,
  slide,
  slideCount,
  variant = "stage",
}: {
  accent: string;
  className?: string;
  deckTitle: string;
  index: number;
  slide: BoardSlide;
  slideCount: number;
  variant?: "stage" | "preview";
}) {
  const resolvedAccent = slide.accent ?? accent;
  const isPreview = variant === "preview";
  const frameStyle = {
    "--slide-accent": resolvedAccent,
    background:
      "linear-gradient(112deg, color-mix(in srgb, var(--slide-accent) 18%, transparent) 0%, transparent 30%), linear-gradient(135deg, #1b1a18 0%, #101113 46%, #171410 100%)",
    boxShadow: isPreview
      ? "0 24px 70px rgba(0,0,0,0.34)"
      : "0 44px 140px rgba(0,0,0,0.46)",
  } as CSSProperties;

  const visibleBullets = slide.bullets?.slice(0, isPreview ? 4 : 6) ?? [];

  return (
    <article
      className={cn(
        "relative isolate grid w-full overflow-hidden rounded-lg border border-white/12 text-white",
        isPreview
          ? "aspect-[16/9] max-h-full max-w-full grid-rows-[auto_1fr_auto] p-5"
          : "aspect-[4/5] max-w-6xl grid-rows-[auto_1fr_auto] p-6 md:aspect-[16/9] md:p-10 lg:p-12",
        className
      )}
      style={frameStyle}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.055)_48%,transparent_49%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[34%] border-l border-white/8 bg-white/[0.035]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: resolvedAccent }}
      />

      <header
        className={cn(
          "relative z-10 flex min-w-0 items-center justify-between gap-4 text-[0.65rem] font-semibold uppercase text-white/46",
          isPreview ? "tracking-[0.12em]" : "tracking-[0.16em]"
        )}
      >
        <span className="min-w-0 truncate">
          {slide.eyebrow ?? `${index + 1}`.padStart(2, "0")}
        </span>
        <span className="min-w-0 truncate text-right">{deckTitle}</span>
      </header>

      <div
        className={cn(
          "relative z-10 grid min-h-0 items-center gap-5",
          isPreview ? "md:grid-cols-[1fr_11rem]" : "md:grid-cols-[1fr_21rem]"
        )}
      >
        <section className="min-w-0">
          <h1
            className={cn(
              "text-balance break-words font-semibold leading-[0.98] tracking-normal text-[#fbf7ee]",
              isPreview
                ? "text-3xl md:text-4xl"
                : "text-4xl md:text-6xl lg:text-7xl"
            )}
          >
            {slide.title}
          </h1>
          {slide.body ? (
            <p
              className={cn(
                "mt-4 max-w-3xl text-pretty leading-relaxed text-white/66",
                isPreview
                  ? "line-clamp-3 text-sm md:text-base"
                  : "text-base md:mt-6 md:text-xl md:leading-8"
              )}
            >
              {slide.body}
            </p>
          ) : null}
        </section>

        <aside
          className={cn(
            "hidden min-h-0 rounded-md border border-white/10 bg-black/22 backdrop-blur md:block",
            isPreview ? "p-3" : "p-5"
          )}
        >
          <div
            className="mb-4 h-1 w-12 rounded-full"
            style={{ background: resolvedAccent }}
          />
          {visibleBullets.length > 0 ? (
            <div className={cn("grid", isPreview ? "gap-2" : "gap-3")}>
              {visibleBullets.map((bullet) => (
                <p
                  className={cn(
                    "border-t border-white/10 pt-2 leading-snug text-white/72",
                    isPreview ? "line-clamp-2 text-xs" : "text-sm"
                  )}
                  key={bullet}
                >
                  {bullet}
                </p>
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              {[0, 1, 2].map((line) => (
                <div className="h-px bg-white/14" key={line} />
              ))}
              <p
                className={cn(
                  "font-semibold leading-none text-white/16",
                  isPreview ? "text-5xl" : "text-7xl"
                )}
              >
                {`${index + 1}`.padStart(2, "0")}
              </p>
            </div>
          )}
        </aside>
      </div>

      <footer className="relative z-10 flex items-center justify-between gap-4 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/42">
        <span>
          {index + 1} / {slideCount}
        </span>
        <span className="min-w-0 truncate text-right">Narrative deck</span>
      </footer>
    </article>
  );
}
