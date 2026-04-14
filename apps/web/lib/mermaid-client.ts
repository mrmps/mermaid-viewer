"use client";

export type MermaidTheme = "auto" | "forest" | "neutral" | "ocean" | "rose";

export const THEMES: { id: MermaidTheme; label: string; dot: string }[] = [
  { id: "auto", label: "Auto", dot: "oklch(0.65 0.24 265)" },
  { id: "forest", label: "Forest", dot: "oklch(0.70 0.19 155)" },
  { id: "neutral", label: "Neutral", dot: "oklch(0.55 0.01 260)" },
  { id: "ocean", label: "Ocean", dot: "oklch(0.72 0.15 220)" },
  { id: "rose", label: "Rose", dot: "oklch(0.65 0.20 15)" },
];

// Built-in themes use mermaid's own color derivation — they look great out of the box.
// Custom themes use "base" with just primaryColor set so derivation still works.
type ThemeConfig = {
  mermaidTheme: "default" | "dark" | "forest" | "neutral" | "base";
  vars?: Record<string, string>;
};

function getConfig(theme: MermaidTheme, uiMode: "dark" | "light"): ThemeConfig {
  switch (theme) {
    case "auto":
      // Use mermaid's polished built-in themes directly
      return { mermaidTheme: uiMode === "dark" ? "dark" : "default" };

    case "forest":
      return { mermaidTheme: "forest" };

    case "neutral":
      return { mermaidTheme: "neutral" };

    case "ocean":
      // base + just the key colors — let mermaid derive the rest
      return uiMode === "dark"
        ? {
            mermaidTheme: "base",
            vars: {
              darkMode: "true",
              primaryColor: "#0c4a6e",
              primaryTextColor: "#e0f2fe",
              primaryBorderColor: "#0ea5e9",
              lineColor: "#38bdf8",
              textColor: "#bae6fd",
              background: "#0a1929",
            },
          }
        : {
            mermaidTheme: "base",
            vars: {
              primaryColor: "#bae6fd",
              primaryTextColor: "#0c4a6e",
              primaryBorderColor: "#0ea5e9",
              lineColor: "#0284c7",
              textColor: "#0c4a6e",
              background: "#f8fffe",
            },
          };

    case "rose":
      return uiMode === "dark"
        ? {
            mermaidTheme: "base",
            vars: {
              darkMode: "true",
              primaryColor: "#4c0519",
              primaryTextColor: "#ffe4e6",
              primaryBorderColor: "#fb7185",
              lineColor: "#f87171",
              textColor: "#fecdd3",
              background: "#1a0008",
            },
          }
        : {
            mermaidTheme: "base",
            vars: {
              primaryColor: "#ffe4e6",
              primaryTextColor: "#881337",
              primaryBorderColor: "#fb7185",
              lineColor: "#e11d48",
              textColor: "#4c0519",
              background: "#fffbfc",
            },
          };

    default:
      return { mermaidTheme: uiMode === "dark" ? "dark" : "default" };
  }
}

let currentKey: string | null = null;
let counter = 0;

function getUIMode(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

async function initMermaid(theme: MermaidTheme) {
  const mermaid = (await import("mermaid")).default;
  const mode = getUIMode();
  const key = `${theme}-${mode}`;

  if (currentKey !== key) {
    const config = getConfig(theme, mode);
    mermaid.initialize({
      startOnLoad: false,
      theme: config.mermaidTheme,
      themeVariables: config.vars
        ? { ...config.vars, fontFamily: "ui-monospace, monospace", fontSize: "14px" }
        : { fontFamily: "ui-monospace, monospace", fontSize: "14px" },
      securityLevel: "loose",
    });
    currentKey = key;
  }
  return mermaid;
}

export async function renderMermaid(
  content: string,
  theme: MermaidTheme = "auto"
): Promise<string> {
  const mermaid = await initMermaid(theme);
  const id = `mermaid-${++counter}-${Date.now()}`;
  const { svg } = await mermaid.render(id, content);
  return svg;
}
