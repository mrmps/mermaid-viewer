"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "@/components/icons/mingcute";

const subscribe = () => () => {};

export function ModeToggle() {
  const { forcedTheme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

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
      {isDark ? (
        <Sun
          aria-hidden="true"
          className={mounted ? "size-4 opacity-100" : "size-4 opacity-0"}
        />
      ) : (
        <Moon
          aria-hidden="true"
          className={mounted ? "size-4 opacity-100" : "size-4 opacity-0"}
        />
      )}
    </button>
  );
}
