import { getDiagram } from "@mermaid-viewer/db";
import { NextRequest } from "next/server";
import { getDiagramMarkdown, MARKDOWN_HEADERS } from "@/lib/machine-content";
import { getBaseUrl } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const v = request.nextUrl.searchParams.get("v");
  const version = v ? parseInt(v, 10) : undefined;

  const data = await getDiagram({ id, version });

  if (!data) {
    return new Response("# Not Found\n\nDiagram not found.\n", {
      status: 404,
      headers: MARKDOWN_HEADERS,
    });
  }

  const baseUrl = getBaseUrl(request);

  const markdown = getDiagramMarkdown(
    baseUrl,
    {
      id: data.diagram.id,
      title: data.diagram.title,
      createdAt: data.diagram.createdAt.toISOString(),
    },
    {
      version: data.currentVersion.version,
      content: data.currentVersion.content,
      createdAt: data.currentVersion.createdAt.toISOString(),
    },
    data.allVersions.map((v) => ({
      version: v.version,
      createdAt: v.createdAt.toISOString(),
    })),
  );

  return new Response(markdown, {
    headers: {
      ...MARKDOWN_HEADERS,
      "Cache-Control": "public, max-age=60",
    },
  });
}
