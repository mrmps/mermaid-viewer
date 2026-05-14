"use client";

import { buildSanitizedUiDocument } from "@/lib/sanitized-ui";

export function SanitizedUiFrame({
  className,
  content,
  title,
}: {
  className?: string;
  content: string;
  title: string;
}) {
  return (
    <iframe
      className={className}
      referrerPolicy="no-referrer"
      sandbox=""
      srcDoc={buildSanitizedUiDocument(content, title)}
      suppressHydrationWarning
      title={title}
    />
  );
}
