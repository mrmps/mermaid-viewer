import { getLlmsFullTxt, MARKDOWN_HEADERS } from "@/lib/machine-content";
import { baseUrl } from "@/lib/env";

export async function GET() {
  return new Response(getLlmsFullTxt(baseUrl), {
    headers: {
      ...MARKDOWN_HEADERS,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
