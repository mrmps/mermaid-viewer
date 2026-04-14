export function generateSkillContent({
  id,
  title,
  baseUrl,
  secret,
  content,
  version,
}: {
  id: string;
  title: string;
  baseUrl: string;
  secret?: string;
  content: string;
  version: number;
}): string {
  const safeTitle = title.replace(/"/g, '\\"');
  const desc = secret
    ? `Read and update the "${safeTitle}" diagram on mermaidsh. Use when asked about this diagram or to update it.`
    : `Read the "${safeTitle}" diagram on mermaidsh. Use when asked about this diagram or its content.`;

  let skill = `---
name: mermaid-${id}
description: "${desc}"
---

# ${title}

Hosted on [mermaidsh](${baseUrl}/d/${id}).

## Fetch latest content

\`\`\`bash
curl ${baseUrl}/api/d/${id}
\`\`\`

Returns JSON with \`content\` (mermaid source), \`version\`, and a \`versions\` array containing every version's content and timestamp. Append \`?v=N\` to fetch a specific version (e.g. \`${baseUrl}/api/d/${id}?v=1\`).`;

  if (secret) {
    skill += `

## Push an update

\`\`\`bash
curl -X PUT ${baseUrl}/api/d/${id} \\
  -H "Authorization: Bearer ${secret}" \\
  -H "Content-Type: text/plain" \\
  -d '<your mermaid content>'
\`\`\`

Each update creates a new version — nothing is overwritten.`;
  }

  skill += `

## Current content (v${version})

\`\`\`mermaid
${content}
\`\`\`
`;

  return skill;
}
