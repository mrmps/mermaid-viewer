const MARKDOWN_EXTENSIONS = /\.(md|markdown|mdown|mkd)$/i;

export function inferMarkdownTitle(content: string, fallback = "Markdown doc") {
  const heading = content
    .split(/\r?\n/)
    .map((line) => line.match(/^#\s+(.+?)\s*#*\s*$/)?.[1]?.trim())
    .find((value): value is string => Boolean(value));

  return heading || fallback;
}

export function titleFromMarkdownFilename(filename: string) {
  const withoutExtension = filename.replace(MARKDOWN_EXTENSIONS, "");
  const title = withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return title || "Markdown doc";
}

export function markdownDownloadFilename(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "markdown-doc"}.md`;
}
