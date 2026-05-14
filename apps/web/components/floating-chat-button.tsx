"use client";

import Link from "next/link";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { MessageSquare } from "@/components/icons/mingcute";

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
        <span className="absolute inset-0 rounded-full bg-sky-500/10 group-hover:bg-sky-500/20 transition-colors duration-200" />
        <MessageSquare className="relative size-3.5 text-sky-600 dark:text-sky-400" />
      </span>
      <span>Create with chat</span>
      <KbdGroup className="ml-1 gap-0.5">
        <Kbd className="h-6 min-w-5 bg-zinc-100/80 px-1.5 text-[11px] text-zinc-500 dark:bg-zinc-700/60 dark:text-zinc-300">
          ⌘
        </Kbd>
        <Kbd className="h-6 min-w-5 bg-zinc-100/80 px-1.5 text-[11px] text-zinc-500 dark:bg-zinc-700/60 dark:text-zinc-300">
          I
        </Kbd>
      </KbdGroup>
    </Link>
  );
}
