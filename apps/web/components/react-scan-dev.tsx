"use client";

// react-scan must be imported before React hooks in this module.
import { scan } from "react-scan";
import { useEffect } from "react";

type ReactScanWindow = Window & {
  __MERMSH_REACT_SCAN_STARTED__?: boolean;
};

export function ReactScanDev({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const scanWindow = window as ReactScanWindow;
    const params = new URLSearchParams(window.location.search);
    const scanRequested =
      params.get("react-scan") === "1" || params.get("scan") === "1";

    if (!scanRequested) {
      window.localStorage.removeItem("react-scan-options");
      return;
    }

    if (scanWindow.__MERMSH_REACT_SCAN_STARTED__) {
      return;
    }

    scanWindow.__MERMSH_REACT_SCAN_STARTED__ = true;
    scan({
      enabled: true,
      showToolbar: true,
      showFPS: true,
      showNotificationCount: true,
      log: params.get("react-scan-log") === "1",
      trackUnnecessaryRenders:
        params.get("react-scan-deep") === "1" ||
        params.get("scan-deep") === "1",
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
