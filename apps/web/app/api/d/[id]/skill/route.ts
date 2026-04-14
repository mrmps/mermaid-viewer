import { getDiagram } from "@mermaid-viewer/db";
import { generateSkillContent } from "@/lib/skill";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const secret = request.nextUrl.searchParams.get("secret");

  const data = await getDiagram({ id });

  if (!data) {
    return Response.json(
      { error: "not_found", message: "Diagram not found" },
      { status: 404 }
    );
  }

  const { diagram, currentVersion } = data;

  // Validate secret if provided
  if (secret && diagram.secret !== secret) {
    return Response.json(
      { error: "unauthorized", message: "Invalid secret" },
      { status: 401 }
    );
  }

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const baseUrl = `${proto}://${host}`;

  const title =
    diagram.title !== "Untitled" ? diagram.title : `Diagram ${id}`;

  const skill = generateSkillContent({
    id,
    title,
    baseUrl,
    secret: secret && diagram.secret === secret ? secret : undefined,
    content: currentVersion.content,
    version: currentVersion.version,
  });

  return new Response(skill, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `inline; filename="SKILL.md"`,
    },
  });
}
