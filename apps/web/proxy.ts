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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

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
