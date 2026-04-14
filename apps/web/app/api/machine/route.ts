import { getMachineMarkdown, MARKDOWN_HEADERS } from "@/lib/machine-content";
import { getBaseUrl } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  return new Response(getMachineMarkdown(baseUrl), {
    headers: {
      ...MARKDOWN_HEADERS,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
