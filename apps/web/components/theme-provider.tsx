"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME,
  MEDIA_QUERY,
  THEMES,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from "@/lib/theme";

type ThemeContextValue = {
  forcedTheme: undefined;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  systemTheme: ResolvedTheme;
  theme: Theme;
  themes: readonly Theme[];
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function readStoredTheme() {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme && THEMES.includes(storedTheme as Theme)) {
      return storedTheme as Theme;
    }
  } catch {}

  return DEFAULT_THEME;
}

function disableThemeTransitions() {
  const style = document.createElement("style");
  style.textContent =
    "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}";
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    window.setTimeout(() => {
      style.remove();
    }, 1);
  };
}

function applyTheme(theme: Theme, disableTransitions = false) {
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  const cleanup = disableTransitions ? disableThemeTransitions() : null;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;

  cleanup?.();

  return resolvedTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme()
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(MEDIA_QUERY);
    const handleMediaChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    mediaQueryList.addEventListener("change", handleMediaChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    applyTheme(theme, true);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [systemTheme, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      forcedTheme: undefined,
      resolvedTheme: theme === "system" ? systemTheme : theme,
      setTheme: setThemeState,
      systemTheme,
      theme,
      themes: THEMES,
    }),
    [systemTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return value;
}
