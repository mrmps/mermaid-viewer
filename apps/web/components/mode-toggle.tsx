"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
  const { forcedTheme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const disabled = !mounted || !!forcedTheme;
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-10 h-10 rounded-lg flex items-center justify-center transition-[background-color] duration-150 cursor-pointer hover:bg-muted text-secondary-foreground"
      aria-label="Toggle color mode"
      aria-disabled={disabled}
      disabled={disabled}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={mounted ? "opacity-100" : "opacity-0"}
      >
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="M4.93 4.93l2.12 2.12" />
        <path d="M16.95 16.95l2.12 2.12" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <path d="M4.93 19.07l2.12-2.12" />
        <path d="M16.95 7.05l2.12-2.12" />
        <path d="M12 8a4 4 0 1 0 0 8" />
        <path d="M12 8a4 4 0 0 1 0 8" />
      </svg>
    </button>
  );
}
