"use client";

// react-scan must be imported before React hooks in this module.
import { scan } from "react-scan";
import { useEffect } from "react";

export function ReactScanDev({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const params = new URLSearchParams(window.location.search);
    const scanRequested =
      params.get("react-scan") === "1" || params.get("scan") === "1";

    if (!scanRequested) {
      window.localStorage.removeItem("react-scan-options");
      return;
    }

    scan({
      enabled: true,
      showToolbar: true,
      safeArea: {
        top: 72,
        right: 24,
        bottom: 24,
        left: 260,
      },
    });
  }, [enabled]);

  return null;
}
