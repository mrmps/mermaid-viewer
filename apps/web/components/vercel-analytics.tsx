import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";

const require = createRequire(import.meta.url);

type AnalyticsComponent = ComponentType<Record<string, never>>;

function getAnalyticsComponent(
  moduleExports: Record<string, unknown>,
): AnalyticsComponent | null {
  if (typeof moduleExports.Analytics === "function") {
    return moduleExports.Analytics as AnalyticsComponent;
  }

  if (
    typeof moduleExports.default === "object" &&
    moduleExports.default !== null &&
    "Analytics" in moduleExports.default &&
    typeof (moduleExports.default as Record<string, unknown>).Analytics ===
      "function"
  ) {
    return (moduleExports.default as { Analytics: AnalyticsComponent })
      .Analytics;
  }

  if (typeof moduleExports.default === "function") {
    return moduleExports.default as AnalyticsComponent;
  }

  return null;
}

async function loadAnalytics(): Promise<AnalyticsComponent | null> {
  try {
    const resolvedPath = require.resolve("@vercel/analytics/next");
    const moduleExports = (await import(
      pathToFileURL(resolvedPath).href
    )) as Record<string, unknown>;

    return getAnalyticsComponent(moduleExports);
  } catch {
    return null;
  }
}

export async function VercelAnalytics() {
  const Analytics = await loadAnalytics();

  if (!Analytics) {
    return null;
  }

  return <Analytics />;
}
