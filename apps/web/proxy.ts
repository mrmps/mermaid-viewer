import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // Content negotiation: serve markdown to non-browser clients hitting /
  if (request.nextUrl.pathname === "/") {
    const accept = request.headers.get("accept") ?? "";
    // Browsers always include text/html in Accept.
    // Programmatic clients (curl, agents, SDKs) typically send */* or omit it.
    if (!accept.includes("text/html")) {
      return NextResponse.rewrite(new URL("/api/machine", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
