"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    // @ts-ignore next-themes types don't include children for React 19
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="mermaid-viewer-mode"
    >
      {children}
    </NextThemesProvider>
  );
}
