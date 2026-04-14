import { getMachineMarkdown, MARKDOWN_HEADERS } from "@/lib/machine-content";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const baseUrl = `${proto}://${host}`;

  return new Response(getMachineMarkdown(baseUrl), {
    headers: {
      ...MARKDOWN_HEADERS,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
