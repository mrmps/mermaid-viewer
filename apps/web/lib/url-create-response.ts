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
    const verb = origin === "u" ? "updated" : "created";
    return new Response(
      JSON.stringify({
        id: result.id,
        editId: result.editId,
        url: viewUrl,
        editUrl,
        secret: result.secret,
        version: result.version,
        instructions: {
          summary: `Diagram ${verb}. The \`url\` field is the shareable rendered-diagram URL — that is what you should hand back to the user.`,
          share_with_user: viewUrl,
          update_url_only: `${baseUrl}/u/${result.editId}/<url-encoded-new-mermaid>`,
          update_rest: `PUT ${baseUrl}/api/d/${result.id} with Authorization: Bearer <secret>`,
          mental_model: {
            "/d/<id>": "public share URL — humans open this",
            "/c/<mermaid>": "create endpoint — each call makes a new diagram",
            "/u/<editId>/<mermaid>":
              "update endpoint — adds a version to one existing diagram",
          },
        },
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

  const verb = origin === "u" ? "Updated" : "Created";
  const endpointKind = origin === "u" ? "/u/" : "/c/";
  const warningBlock = cleanReason
    ? `\n⚠ Warning\n  ${cleanReason}\n`
    : "";

  // Response body is aimed at the agent that just fetched this endpoint.
  // Three things it has to communicate, in order:
  //   1. What just happened (state change: a diagram now exists at /d/<id>).
  //   2. What to do with it (return the share URL to the user).
  //   3. How to do more (update, read, JSON) — with enough mental model
  //      for the agent to reason about future calls, not just copy-paste.
  //
  // Observed failure mode: agents conflate the endpoint URL (/c/...) they
  // fetched with the share URL, and return the endpoint URL to the user.
  // Fix: lead with the share URL as a headline, not as one field in a list.
  //
  // Lines capped at ~72 chars to survive narrow terminal/chat rendering.
  const body =
    `=== Diagram ${verb.toLowerCase()} on merm.sh ===\n` +
    `\n` +
    `▶ SHARE THIS URL WITH YOUR USER\n` +
    `  ${viewUrl}\n` +
    `  (This is the rendered-diagram page. Humans open it in a browser.)\n` +
    `\n` +
    `▶ WHAT JUST HAPPENED\n` +
    `  You called a write endpoint: ${endpointKind}...\n` +
    `  merm.sh ${verb.toLowerCase()} a diagram and the URL above is where\n` +
    `  it lives. The ${endpointKind} URL you fetched is the endpoint —\n` +
    `  calling it again creates another diagram / version, it is not a\n` +
    `  share link.\n` +
    warningBlock +
    `\n` +
    `▶ KEY FIELDS\n` +
    `  url        ${viewUrl}\n` +
    `             (public; share with humans)\n` +
    `  editUrl    ${editUrl}\n` +
    `             (browser editor; share with anyone who should edit)\n` +
    `  editId     ${result.editId}\n` +
    `             (use in URL-only update path; no auth needed)\n` +
    `  secret     ${result.secret}\n` +
    `             (Bearer token for REST; returned once — save it)\n` +
    `  version    ${result.version}\n` +
    `             (every update creates a new version; history is kept)\n` +
    `\n` +
    `▶ HOW TO DO MORE\n` +
    `\n` +
    `  Add a new version to THIS diagram (URL-only, no POST):\n` +
    `    ${baseUrl}/u/${result.editId}/<url-encoded-new-mermaid>\n` +
    `\n` +
    `  Update via REST (if you can send headers):\n` +
    `    PUT ${baseUrl}/api/d/${result.id}\n` +
    `    Authorization: Bearer <secret>\n` +
    `    body: <raw mermaid>\n` +
    `\n` +
    `  Read current content + all versions:\n` +
    `    ${baseUrl}/api/d/${result.id}\n` +
    `\n` +
    `  Get JSON instead of this text:\n` +
    `    Append ?format=json to any /c, /u, or /api/d GET request.\n` +
    `\n` +
    `▶ MENTAL MODEL (5 seconds)\n` +
    `  /d/<id>          public share URL — humans open this\n` +
    `  /c/<mermaid>     create endpoint — each call makes a NEW diagram\n` +
    `  /u/<edit>/<m>    update endpoint — adds a version to one diagram\n` +
    `  Nothing is overwritten. Every update is a new version you can\n` +
    `  restore by fetching /api/d/<id>?v=N.\n`;

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
