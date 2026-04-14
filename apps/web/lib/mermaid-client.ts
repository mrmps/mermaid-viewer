"use client";

import { prepareMermaidSource } from "@/lib/mermaid-source";

export type MermaidTheme = "auto" | "forest" | "neutral" | "ocean" | "rose";
export type MermaidLook = "classic" | "handDrawn" | "neo";

export const THEMES: { id: MermaidTheme; label: string; dot: string }[] = [
  { id: "auto", label: "Auto", dot: "oklch(0.65 0.24 265)" },
  { id: "forest", label: "Forest", dot: "oklch(0.70 0.19 155)" },
  { id: "neutral", label: "Neutral", dot: "oklch(0.55 0.01 260)" },
  { id: "ocean", label: "Ocean", dot: "oklch(0.72 0.15 220)" },
  { id: "rose", label: "Rose", dot: "oklch(0.65 0.20 15)" },
];

export const LOOKS: { id: MermaidLook; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "handDrawn", label: "Hand-drawn" },
  { id: "neo", label: "Neo" },
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
      return uiMode === "dark"
        ? {
            mermaidTheme: "base",
            vars: {
              darkMode: "true",
              primaryColor: "#14532d",
              primaryTextColor: "#dcfce7",
              primaryBorderColor: "#22c55e",
              lineColor: "#4ade80",
              textColor: "#bbf7d0",
              background: "#071a13",
              // Mindmap branch colors — vibrant enough for dark backgrounds
              cScale0: "#166534",
              cScale1: "#15803d",
              cScale2: "#047857",
              cScale3: "#0f766e",
              cScale4: "#065f46",
              cScale5: "#14532d",
              cScale6: "#1e6b3a",
              cScale7: "#0d6948",
              cScale8: "#115e59",
              cScale9: "#134e4a",
              cScale10: "#064e3b",
              cScale11: "#1a4731",
              scaleLabelColor: "#dcfce7",
            },
          }
        : { mermaidTheme: "forest" };

    case "neutral":
      return uiMode === "dark"
        ? {
            mermaidTheme: "base",
            vars: {
              darkMode: "true",
              primaryColor: "#27272a",
              primaryTextColor: "#e4e4e7",
              primaryBorderColor: "#52525b",
              lineColor: "#71717a",
              textColor: "#d4d4d8",
              background: "#111113",
              cScale0: "#3f3f46",
              cScale1: "#52525b",
              cScale2: "#44403c",
              cScale3: "#525252",
              cScale4: "#4b5563",
              cScale5: "#57534e",
              cScale6: "#374151",
              cScale7: "#404040",
              cScale8: "#475569",
              cScale9: "#3f3f46",
              cScale10: "#4a4a4f",
              cScale11: "#334155",
              scaleLabelColor: "#e4e4e7",
            },
          }
        : { mermaidTheme: "neutral" };

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
              cScale0: "#0c4a6e",
              cScale1: "#1e40af",
              cScale2: "#1d4ed8",
              cScale3: "#0369a1",
              cScale4: "#0e7490",
              cScale5: "#155e75",
              cScale6: "#1e3a5f",
              cScale7: "#164e63",
              cScale8: "#1e3a8a",
              cScale9: "#0f4c81",
              cScale10: "#075985",
              cScale11: "#0c3547",
              scaleLabelColor: "#e0f2fe",
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
              cScale0: "#9f1239",
              cScale1: "#be123c",
              cScale2: "#a21caf",
              cScale3: "#7e22ce",
              cScale4: "#c026d3",
              cScale5: "#be185d",
              cScale6: "#e11d48",
              cScale7: "#db2777",
              cScale8: "#9333ea",
              cScale9: "#b91c1c",
              cScale10: "#c2410c",
              cScale11: "#a16207",
              scaleLabelColor: "#fce7f3",
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

/**
 * Parse a CSS color (hex or rgb()) to [r, g, b] in 0-255.
 * Returns null for colors it can't parse.
 */
function parseColor(color: string): [number, number, number] | null {
  color = color.trim().toLowerCase();

  // #rgb or #rrggbb
  const hexMatch = color.match(
    /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/,
  );
  if (hexMatch) {
    return [
      parseInt(hexMatch[1], 16),
      parseInt(hexMatch[2], 16),
      parseInt(hexMatch[3], 16),
    ];
  }
  const hex3 = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (hex3) {
    return [
      parseInt(hex3[1] + hex3[1], 16),
      parseInt(hex3[2] + hex3[2], 16),
      parseInt(hex3[3] + hex3[3], 16),
    ];
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = color.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
  );
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }

  return null;
}

/**
 * WCAG relative luminance from sRGB 0-255 values.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Walk the rendered SVG and fix any low-contrast text.
 * For each <text> element, find the nearest ancestor shape's fill,
 * compute luminance, and flip the text to dark or light if needed.
 */
export function fixSvgTextContrast(svgEl: SVGSVGElement) {
  const texts = svgEl.querySelectorAll("text");

  for (const textEl of texts) {
    // Walk up the DOM to find the nearest filled rect/polygon/path/circle
    const bg = findAncestorFill(textEl);
    if (!bg) continue;

    const bgRgb = parseColor(bg);
    if (!bgRgb) continue;

    const bgLum = relativeLuminance(...bgRgb);
    // Pick dark or light text for good contrast (threshold ~0.179 per WCAG)
    const idealText = bgLum > 0.179 ? "#1a1a1a" : "#f5f5f5";

    // Check if current text color already has good contrast
    const currentFill = textEl.getAttribute("fill") || "";
    const currentRgb = parseColor(currentFill);
    if (currentRgb) {
      const currentLum = relativeLuminance(...currentRgb);
      const lighter = Math.max(bgLum, currentLum);
      const darker = Math.min(bgLum, currentLum);
      const ratio = (lighter + 0.05) / (darker + 0.05);
      // WCAG AA requires 4.5:1 for normal text — bail if already fine
      if (ratio >= 4.5) continue;
    }

    textEl.setAttribute("fill", idealText);
  }
}

/**
 * Walk up the DOM tree from a text element to find the fill color
 * of its containing shape (rect, polygon, circle, path with fill, etc).
 */
function findAncestorFill(el: Element): string | null {
  let node: Element | null = el.parentElement;
  while (node && node.tagName !== "svg") {
    // Check for a rect/polygon/circle/ellipse/path sibling with a fill
    const shapes = node.querySelectorAll(
      ":scope > rect, :scope > polygon, :scope > circle, :scope > ellipse, :scope > path",
    );
    for (const shape of shapes) {
      // Try inline attribute first
      const fill = shape.getAttribute("fill");
      if (fill && fill !== "none" && fill !== "transparent") {
        return fill;
      }
      // Fall back to computed style (handles CSS class-applied fills)
      if (typeof getComputedStyle !== "undefined") {
        const computed = getComputedStyle(shape).fill;
        if (computed && computed !== "none" && computed !== "transparent") {
          return computed;
        }
      }
    }
    // Also check if the group itself has a fill
    const ownFill = node.getAttribute("fill");
    if (ownFill && ownFill !== "none" && ownFill !== "transparent") {
      return ownFill;
    }
    node = node.parentElement;
  }
  return null;
}

let currentKey: string | null = null;
let counter = 0;

function getUIMode(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function sanitizeSvg(svg: string): string {
  // Parse as HTML — the browser's HTML parser handles bare <br>, unclosed
  // elements, and all HTML-isms inside foreignObject correctly.
  // This avoids the XML parsing that caused parseerror rendering bugs.
  const doc = new DOMParser().parseFromString(svg, "text/html");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) return "";

  svgEl.querySelectorAll("script").forEach((n) => n.remove());

  for (const el of svgEl.querySelectorAll("*")) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (
        (name === "href" || name === "xlink:href") &&
        attr.value.trim().toLowerCase().startsWith("javascript:")
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }

  return svgEl.outerHTML;
}

async function initMermaid(theme: MermaidTheme, look: MermaidLook = "classic") {
  const mermaid = (await import("mermaid")).default;
  const mode = getUIMode();
  const key = `${theme}-${mode}-${look}`;

  if (currentKey !== key) {
    const config = getConfig(theme, mode);

    const fontFamily =
      look === "handDrawn"
        ? '"Virgil", "Segoe Print", "Bradley Hand", Chilanka, TSCu_Comic, casual, cursive'
        : "ui-monospace, monospace";

    mermaid.initialize({
      startOnLoad: false,
      theme: config.mermaidTheme,
      look,
      handDrawnSeed: 42,
      themeVariables: config.vars
        ? { ...config.vars, fontFamily, fontSize: "14px" }
        : { fontFamily, fontSize: "14px" },
      securityLevel: "antiscript",
    });
    currentKey = key;
  }

  return mermaid;
}

export async function renderMermaid(
  content: string,
  theme: MermaidTheme = "auto",
  look: MermaidLook = "classic",
): Promise<string> {
  const mermaid = await initMermaid(theme, look);
  const id = `mermaid-${++counter}-${Date.now()}`;
  const diagram = prepareMermaidSource(content, { look });

  try {
    const { svg } = await mermaid.render(id, diagram);
    return sanitizeSvg(svg);
  } catch (e) {
    // Mermaid leaves behind a temp element (id prefixed with "d") on error — remove it
    document.getElementById(`d${id}`)?.remove();
    throw e;
  }
}
