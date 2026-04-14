export const THEME_STORAGE_KEY = "mermaid-viewer-mode";
export const MEDIA_QUERY = "(prefers-color-scheme: dark)";

export const THEMES = ["light", "dark", "system"] as const;

export type Theme = (typeof THEMES)[number];
export type ResolvedTheme = Exclude<Theme, "system">;

export const DEFAULT_THEME: Theme = "system";

export function getThemeBootstrapScript() {
  return `try {
  var storedTheme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  var theme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : ${JSON.stringify(DEFAULT_THEME)};
  var resolvedTheme = theme === "dark" || (theme === "system" && window.matchMedia(${JSON.stringify(MEDIA_QUERY)}).matches) ? "dark" : "light";
  var root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
} catch (_) {}`;
}
