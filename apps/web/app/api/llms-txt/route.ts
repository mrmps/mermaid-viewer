import { getLlmsTxt, MARKDOWN_HEADERS } from "@/lib/machine-content";
import { baseUrl } from "@/lib/env";

export async function GET() {
  return new Response(getLlmsTxt(baseUrl), {
    headers: {
      ...MARKDOWN_HEADERS,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
