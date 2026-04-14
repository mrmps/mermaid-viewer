"use client";

import { useEffect } from "react";

export function ThemeInit() {
  useEffect(() => {
    try {
      const mode = localStorage.getItem("mermaid-viewer-mode");
      if (mode === "light") {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, []);

  return null;
}
