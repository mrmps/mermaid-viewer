import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, type Tier } from "./lib/rate-limit";
import { LLMS_HEADERS } from "./lib/machine-content";

function getTier(pathname: string, method: string): Tier | null {
  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) return null;

  if (pathname === "/api/chat") return "chat";
  if (method === "GET" || method === "HEAD") return "read";
  return "write"; // POST, PUT, PATCH, DELETE
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

const GUESS_CREATE_PATHS = new Set([
  "/new",
  "/create",
  "/api/new",
  "/api/create",
  "/api/d/new",
  "/api/d/create",
  // Bare URL-only endpoint paths — agents hitting these without a content
  // segment should get the hint-404, not Next.js' default HTML.
  "/c",
  "/u",
]);

function buildGuessHint(origin: string) {
  return (
    "404 Not Found — but you're close.\n" +
    "\n" +
    "URL-only diagram creation lives at:\n" +
    `  GET ${origin}/c/<url-encoded-mermaid>\n` +
    `  GET ${origin}/u/<editId>/<url-encoded-mermaid> (update)\n` +
    `  GET ${origin}/api/d?content=<url-encoded-mermaid>  (query-param alternative)\n` +
    "\n" +
    "Full docs: " +
    origin +
    "/llms.txt\n"
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // --- URL-only-agent guess redirects ---
  // Real subagent traces showed that GET-only agents naturally try
  // /new, /create, /api/create, etc. with ?content=... — serve them a
  // 307 to /c/<content> or a helpful plain-text hint.
  if (GUESS_CREATE_PATHS.has(pathname) && method === "GET") {
    const params = request.nextUrl.searchParams;
    const content = params.get("content");
    if (content) {
      const target = new URL(
        `/c/${encodeURIComponent(content)}`,
        request.nextUrl.origin
      );
      const format = params.get("format");
      const title = params.get("title");
      if (format) target.searchParams.set("format", format);
      if (title) target.searchParams.set("title", title);
      return NextResponse.redirect(target, 307);
    }

    const accept = request.headers.get("accept") ?? "";
    if (accept.includes("application/json")) {
      return NextResponse.json(
        {
          error: "not_found",
          message:
            "URL-only create endpoints: GET /c/<mermaid>, /u/<editId>/<mermaid>, or /api/d?content=<mermaid>. See /llms.txt for full docs.",
          endpoints: {
            create_from_mermaid: `${request.nextUrl.origin}/c/<url-encoded-mermaid>`,
            update_existing: `${request.nextUrl.origin}/u/<editId>/<url-encoded-mermaid>`,
            query_style_create: `${request.nextUrl.origin}/api/d?content=<url-encoded-mermaid>`,
            docs: `${request.nextUrl.origin}/llms.txt`,
          },
        },
        { status: 404 }
      );
    }
    return new NextResponse(buildGuessHint(request.nextUrl.origin), {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // --- Rate limiting (API routes only) ---
  const tier = getTier(pathname, method);
  if (tier) {
    const ip = getClientIp(request);
    const result = await checkRateLimit(ip, tier);
    if (result.limited) {
      return Response.json(
        { error: "rate_limited", message: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfter),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // --- Content negotiation ---
  const accept = request.headers.get("accept") ?? "";
  const ua = (request.headers.get("user-agent") ?? "").toLowerCase();
  const isSocialCrawler =
    /twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|pinterestbot|redditbot/.test(
      ua,
    );
  const wantsMarkdown =
    !isSocialCrawler &&
    (accept.includes("text/markdown") || !accept.includes("text/html"));

  if (wantsMarkdown) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/api/machine", request.url));
    }

    const diagramMatch = pathname.match(/^\/d\/([^/]+)$/);
    if (diagramMatch) {
      const url = new URL(
        `/api/d/${diagramMatch[1]}/markdown`,
        request.url,
      );
      const v = request.nextUrl.searchParams.get("v");
      if (v) url.searchParams.set("v", v);
      return NextResponse.rewrite(url);
    }
  }

  // All HTML responses: inject llms.txt discovery headers
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(LLMS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|hero\\.png).*)",
  ],
};
