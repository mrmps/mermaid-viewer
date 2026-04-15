import { baseUrl } from "@/lib/env";

type CreateResult = {
  id: string;
  editId: string;
  secret: string;
  version: number;
};

export type ResponseFormat = "text" | "json";

export function pickFormat(
  acceptHeader: string | null,
  queryFormat: string | null
): ResponseFormat {
  const q = queryFormat?.toLowerCase().trim();
  if (q === "json") return "json";
  if (q === "text" || q === "plain") return "text";
  const accept = acceptHeader ?? "";
  if (accept.includes("application/json")) return "json";
  return "text";
}

/**
 * Validator error messages sometimes contain Turbopack/webpack module paths
 * like `__TURBOPACK__imported__module__$5b$project$5d2f$...`. Those are
 * internal noise that confuses agents and leaks filesystem structure.
 * Strip them and keep just the human-readable tail.
 */
const FRIENDLY_FALLBACK =
  "Mermaid validation is temporarily unavailable on the server (not your diagram's fault). The diagram was saved as-is; open the View URL to confirm it renders.";

/**
 * HTTP headers must be ISO-8859-1 / latin-1. Replace any non-latin-1 code
 * points (em-dash, smart quotes, etc.) with ASCII approximations.
 */
function toHeaderSafe(value: string): string {
  return value
    .replace(/[\u2012-\u2015\u2212]/g, "-") // em/en dashes
    .replace(/[\u2018\u2019\u201B]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D\u201F]/g, '"') // smart double quotes
    .replace(/\u2026/g, "...") // horizontal ellipsis
    .replace(/[^\x20-\x7E]/g, "?"); // anything else outside printable ASCII
}

export function cleanValidationReason(raw: string): string {
  if (!raw) return raw;
  // Specifically match the known DOMPurify / mermaid-server-render bug so
  // agents don't see scary-looking internals like "addHook is not a function".
  if (
    /addHook is not a function/i.test(raw) ||
    /DOMPurify/i.test(raw)
  ) {
    return FRIENDLY_FALLBACK;
  }
  // Collapse bundler-mangled module paths (turbopack / webpack).
  const bundlerPathPattern =
    /__(?:TURBOPACK|WEBPACK)__[A-Za-z0-9_$]+(?:[A-Za-z0-9_$]|\$[0-9a-f]{2}\$)*/g;
  let cleaned = raw.replace(bundlerPathPattern, "<bundled module>");
  cleaned = cleaned.replace(
    /\/(?:[A-Za-z0-9._-]+\/)*node_modules\/[^\s:]+/g,
    "<node_modules path>"
  );
  // Still gnarly? Friendly fallback.
  if (
    cleaned.length > 180 ||
    /[$]{2,}/.test(cleaned) ||
    /<bundled module>/.test(cleaned)
  ) {
    return FRIENDLY_FALLBACK;
  }
  return cleaned;
}

interface UrlCreateResponseOptions {
  result: CreateResult;
  format: ResponseFormat;
  /** Hint about how this diagram was created, for the plain text body. */
  origin?: "c" | "u";
  /** If set, validation didn't actually run. Attach a warning header. */
  validationSkippedReason?: string;
}

export function urlCreateResponse({
  result,
  format,
  origin,
  validationSkippedReason,
}: UrlCreateResponseOptions) {
  const viewUrl = `${baseUrl}/d/${result.id}`;
  const editUrl = `${baseUrl}/e/${result.editId}`;

  const cleanReason = validationSkippedReason
    ? cleanValidationReason(validationSkippedReason)
    : undefined;

  const headers = {
    "content-type":
      format === "json"
        ? "application/json; charset=utf-8"
        : "text/plain; charset=utf-8",
    "x-diagram-id": result.id,
    "x-edit-id": result.editId,
    "x-diagram-url": viewUrl,
    "x-edit-url": editUrl,
    "x-diagram-secret": result.secret,
    ...(cleanReason
      ? {
          "x-validation": "skipped",
          "x-validation-reason": toHeaderSafe(cleanReason).slice(0, 200),
        }
      : {}),
  } as Record<string, string>;

  if (format === "json") {
    return new Response(
      JSON.stringify({
        id: result.id,
        editId: result.editId,
        url: viewUrl,
        editUrl,
        secret: result.secret,
        version: result.version,
        ...(cleanReason
          ? {
              warning: "validation_skipped",
              warningReason: cleanReason,
            }
          : {}),
      }),
      { status: 201, headers }
    );
  }

  const originHint =
    origin === "u"
      ? "Updated: new version saved on the existing diagram.\n"
      : origin === "c"
        ? "Created from the Mermaid source in your URL.\n"
        : "";

  const warningLine = cleanReason ? `\nWarning: ${cleanReason}\n` : "";

  const body =
    `${originHint}${warningLine}` +
    `\nView:    ${viewUrl}\n` +
    `Edit:    ${editUrl}\n` +
    `Secret:  ${result.secret}\n` +
    `Version: ${result.version}\n` +
    `\n` +
    `# To add a new version of THIS diagram (URL-only agents, no POST):\n` +
    `#   GET ${baseUrl}/u/${result.editId}/<url-encoded-new-mermaid>\n` +
    `# To update via REST (agents that can POST/PUT):\n` +
    `#   PUT ${baseUrl}/api/d/${result.id}  (Authorization: Bearer <secret>)\n` +
    `# For JSON output, add ?format=json to any /c or /u URL.\n`;

  return new Response(body, { status: 201, headers });
}

export function urlErrorResponse(
  format: ResponseFormat,
  status: number,
  error: string,
  message: string,
  extra?: Record<string, unknown>
) {
  const headers = {
    "content-type":
      format === "json"
        ? "application/json; charset=utf-8"
        : "text/plain; charset=utf-8",
  };
  if (format === "json") {
    return new Response(
      JSON.stringify({ error, message, ...(extra ?? {}) }),
      { status, headers }
    );
  }
  const extraText = extra
    ? "\n\n" +
      Object.entries(extra)
        .map(([k, v]) => `--- ${k} ---\n${v}`)
        .join("\n\n")
    : "";
  return new Response(`${message}${extraText}\n`, { status, headers });
}
