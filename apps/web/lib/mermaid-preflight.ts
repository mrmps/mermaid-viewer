import { prepareMermaidSource } from "@/lib/mermaid-source";

export function preflightCheck(content: string): boolean {
  const normalized = prepareMermaidSource(content);
  const lines = normalized.split(/\r?\n/);

  let index = 0;
  if (lines[index]?.trim() === "---") {
    index += 1;
    while (index < lines.length && lines[index].trim() !== "---") {
      index += 1;
    }
    index += 1;
  }

  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed || (trimmed.startsWith("%%{") && trimmed.endsWith("}%%"))) {
      index += 1;
      continue;
    }
    return /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline|quadrantChart|sankey|xychart|block|packet|kanban|architecture)/.test(trimmed);
  }

  return false;
}
