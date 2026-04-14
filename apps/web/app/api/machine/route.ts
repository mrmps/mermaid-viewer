import { getMachineMarkdown } from "@/lib/machine-content";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const baseUrl = `${proto}://${host}`;

  return new Response(getMachineMarkdown(baseUrl), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
