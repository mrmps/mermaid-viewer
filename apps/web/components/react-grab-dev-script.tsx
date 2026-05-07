"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export function ReactGrabDevScript({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();

  if (!enabled || pathname === "/b" || pathname.startsWith("/b/") || pathname.startsWith("/be/")) {
    return null;
  }

  return (
    <Script
      crossOrigin="anonymous"
      src="//unpkg.com/react-grab/dist/index.global.js"
      strategy="afterInteractive"
    />
  );
}
