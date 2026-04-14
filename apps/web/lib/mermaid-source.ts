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

function isDiagramTypeLine(line: string): boolean {
  const trimmed = line.trim();
  return VALID_DIAGRAM_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

function quoteYamlString(value: string): string {
  return JSON.stringify(value);
}

function consumeFrontmatter(lines: string[]): {
  frontmatterLines: string[];
  remainingLines: string[];
} {
  if (lines[0]?.trim() !== "---") {
    return { frontmatterLines: [], remainingLines: lines };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatterLines: [], remainingLines: lines };
  }

  return {
    frontmatterLines: lines.slice(0, endIndex + 1),
    remainingLines: lines.slice(endIndex + 1),
  };
}

function consumeInitDirectives(lines: string[]): {
  initLines: string[];
  remainingLines: string[];
} {
  let index = 0;
  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      index += 1;
      continue;
    }
    if (trimmed.startsWith("%%{") && trimmed.endsWith("}%%")) {
      index += 1;
      continue;
    }
    break;
  }

  const initLines = lines.slice(0, index).filter((line) => line.trim());
  const remainingLines = lines.slice(index);
  return { initLines, remainingLines };
}

function consumeLeadingTitle(lines: string[]): {
  title: string | null;
  remainingLines: string[];
} {
  let index = 0;
  while (index < lines.length && !lines[index].trim()) {
    index += 1;
  }

  const firstMeaningfulLine = lines[index]?.trim();
  if (!firstMeaningfulLine?.startsWith("title:")) {
    return { title: null, remainingLines: lines };
  }

  const title = firstMeaningfulLine.slice("title:".length).trim();
  let nextIndex = index + 1;
  while (nextIndex < lines.length && !lines[nextIndex].trim()) {
    nextIndex += 1;
  }

  if (!isDiagramTypeLine(lines[nextIndex] ?? "")) {
    return { title: null, remainingLines: lines };
  }

  return {
    title,
    remainingLines: [...lines.slice(0, index), ...lines.slice(index + 1)],
  };
}

function injectTitleIntoFrontmatter(
  frontmatterLines: string[],
  title: string,
): string[] {
  if (frontmatterLines.some((line) => line.trim().startsWith("title:"))) {
    return frontmatterLines;
  }

  const closingIndex = frontmatterLines.length - 1;
  return [
    ...frontmatterLines.slice(0, closingIndex),
    `title: ${quoteYamlString(title)}`,
    frontmatterLines[closingIndex],
  ];
}

function buildFrontmatter(title: string | null, look?: string): string[] {
  const lines = ["---"];

  if (title) {
    lines.push(`title: ${quoteYamlString(title)}`);
  }

  if (look) {
    lines.push("config:");
    lines.push(`  look: ${look}`);
  }

  lines.push("---");
  return lines;
}

export function prepareMermaidSource(
  content: string,
  options?: { look?: string },
): string {
  const lines = content.trim().split(/\r?\n/);
  const { frontmatterLines, remainingLines: withoutFrontmatter } =
    consumeFrontmatter(lines);
  const { initLines, remainingLines: withoutInit } =
    consumeInitDirectives(withoutFrontmatter);
  const { title, remainingLines: withoutTitle } =
    consumeLeadingTitle(withoutInit);

  const normalizedBody = withoutTitle.join("\n").trimStart();

  let nextFrontmatter = frontmatterLines;
  if (title && nextFrontmatter.length > 0) {
    nextFrontmatter = injectTitleIntoFrontmatter(nextFrontmatter, title);
  } else if (nextFrontmatter.length === 0 && (title || options?.look)) {
    nextFrontmatter = buildFrontmatter(title, options?.look);
  }

  const parts = [
    nextFrontmatter.join("\n"),
    initLines.join("\n"),
    normalizedBody,
  ].filter(Boolean);

  return parts.join("\n");
}
