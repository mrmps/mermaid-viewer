/**
 * Regression tests for the theme-bootstrap <script> in RootLayout.
 *
 * History: the theme flash has recurred at least four times. Every time, a
 * well-meaning "fix" swapped the raw inline <script> for next/script or
 * next-themes. Both emit async loader chunks in App Router — the bootstrap
 * then runs AFTER first paint, reintroducing the flash.
 *
 * These tests make the requirement explicit: the RootLayout MUST render a
 * synchronous inline <script> whose body toggles the `dark` class on
 * document.documentElement before CSS paints.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getThemeBootstrapScript } from "@/lib/theme";

const WEB_DIR = join(__dirname, "..");
const LAYOUT = readFileSync(join(WEB_DIR, "app/layout.tsx"), "utf-8");

describe("Theme bootstrap script", () => {
  it("RootLayout renders a raw <script dangerouslySetInnerHTML> (not next/script)", () => {
    expect(LAYOUT).toMatch(
      /<script[^>]*dangerouslySetInnerHTML=\{\{\s*__html:\s*getThemeBootstrapScript\(\)/,
    );
  });

  it("RootLayout does NOT use next/script for theme bootstrap", () => {
    const themeScriptViaNextScript =
      /<Script[^>]*strategy=["']beforeInteractive["'][^>]*>\s*\{?\s*getThemeBootstrapScript/;
    expect(LAYOUT).not.toMatch(themeScriptViaNextScript);
  });

  it("RootLayout places the theme bootstrap inside <head>", () => {
    const headBlock = LAYOUT.match(/<head>[\s\S]*?<\/head>/);
    expect(headBlock).not.toBeNull();
    expect(headBlock![0]).toContain("getThemeBootstrapScript()");
  });

  it("bootstrap script toggles the 'dark' class on documentElement", () => {
    const src = getThemeBootstrapScript();
    expect(src).toContain("document.documentElement");
    expect(src).toMatch(/classList\.toggle\(["']dark["']/);
  });

  it("bootstrap script reads the expected localStorage key", () => {
    const src = getThemeBootstrapScript();
    expect(src).toContain("mermaid-viewer-mode");
  });

  it("bootstrap script sets color-scheme for correct native-control rendering", () => {
    const src = getThemeBootstrapScript();
    expect(src).toContain("colorScheme");
  });
});
