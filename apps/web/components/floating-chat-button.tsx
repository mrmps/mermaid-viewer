"use client";

import Link from "next/link";

export function FloatingChatButton() {
  return (
    <Link
      href="/chat"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full h-10 pl-3.5 pr-4 text-[13px] font-medium
        bg-emerald-950/80 text-emerald-100 border border-emerald-400/15
        shadow-[0_0_0_1px_rgba(52,211,153,0.06),0_2px_12px_-2px_rgba(0,0,0,0.4),0_0_20px_-4px_rgba(52,211,153,0.12)]
        backdrop-blur-xl
        hover:bg-emerald-950/90 hover:border-emerald-400/25 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.1),0_4px_16px_-2px_rgba(0,0,0,0.5),0_0_24px_-4px_rgba(52,211,153,0.2)]
        transition-all duration-200 ease-out
        dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-400/20
        dark:hover:bg-emerald-950/80 dark:hover:border-emerald-400/30"
    >
      <span className="relative flex items-center justify-center size-5">
        <span className="absolute inset-0 rounded-full bg-emerald-400/15 group-hover:bg-emerald-400/25 transition-colors duration-200" />
        <svg
          className="relative size-3 text-emerald-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </span>
      <span className="relative">
        Create with chat
        <span className="absolute -bottom-px left-0 right-0 h-px bg-emerald-400/0 group-hover:bg-emerald-400/30 transition-colors duration-200" />
      </span>
    </Link>
  );
}
