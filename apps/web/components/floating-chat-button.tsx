"use client";

import Link from "next/link";
import { Kbd } from "@/components/ui/kbd";

export function FloatingChatButton() {
  return (
    <Link
      href="/chat"
      aria-keyshortcuts="Meta+I Control+I"
      className="group fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full h-11 pl-4 pr-3 text-sm font-semibold
        bg-white text-zinc-900 border border-zinc-200
        shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.12)]
        hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-[0_2px_6px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.16)]
        transition-all duration-200 ease-out
        dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600
        dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.3)]
        dark:hover:bg-zinc-700 dark:hover:border-zinc-500 dark:hover:shadow-[0_2px_6px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.4)]"
    >
      <span className="relative flex items-center justify-center size-5">
        <span className="absolute inset-0 rounded-full bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors duration-200" />
        <svg
          className="relative size-3.5 text-violet-600 dark:text-violet-400"
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
      <span>Create with chat</span>
      <Kbd className="ml-1 h-6 px-1.5 gap-0.5 text-[11px] font-medium bg-zinc-100/80 border-zinc-200 text-zinc-500 dark:bg-zinc-700/60 dark:border-zinc-600 dark:text-zinc-300">
        <span className="text-[13px] leading-none">⌘</span>
        <span>I</span>
      </Kbd>
    </Link>
  );
}
