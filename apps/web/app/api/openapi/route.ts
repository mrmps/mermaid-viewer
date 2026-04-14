import { buildOpenAPISpec } from "@/lib/openapi";

export async function GET() {
  return Response.json(buildOpenAPISpec(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
