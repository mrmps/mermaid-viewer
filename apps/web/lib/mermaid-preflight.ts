const VALID_DIAGRAM_PREFIXES = [
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "erDiagram",
  "gantt",
  "pie",
  "gitGraph",
  "journey",
  "mindmap",
  "timeline",
  "quadrantChart",
  "sankey",
  "xychart",
  "block",
  "packet",
  "kanban",
  "architecture",
];

export function preflightCheck(content: string): boolean {
  const trimmed = content.trim();
  // Handle ---config--- frontmatter
  const body = trimmed.startsWith("---")
    ? trimmed.slice(trimmed.indexOf("---", 3) + 3).trim()
    : trimmed;

  return VALID_DIAGRAM_PREFIXES.some((prefix) => body.startsWith(prefix));
}
