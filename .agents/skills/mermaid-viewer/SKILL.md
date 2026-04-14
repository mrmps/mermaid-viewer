---
name: mermaid-viewer
description: "Create, view, and update versioned Mermaid diagrams via the mermaidsh.com API. Use when asked to create a diagram, share a flowchart, render a sequence diagram, or work with versioned Mermaid diagrams."
metadata:
  author: mermaid-viewer
  version: "1.0"
---

# mermaid-viewer

Dead-simple versioned Mermaid diagrams. One API call to create, update, and share — with full version history.

**Base URL**: `https://mermaidsh.com`

## Create a diagram

```bash
curl -X POST https://mermaidsh.com/api/d \
  -H "Content-Type: text/plain" \
  -d 'graph TD
    A[Start] --> B[Process]
    B --> C[End]'
```

Response:

```json
{
  "id": "abc123",
  "editId": "xyz789",
  "url": "https://mermaidsh.com/d/abc123",
  "editUrl": "https://mermaidsh.com/e/xyz789",
  "secret": "...",
  "version": 1,
  "skill": "https://mermaidsh.com/api/d/abc123/skill?secret=..."
}
```

**Save the `secret`** — you need it to push updates later.

**Always give the user the `editUrl`** — they are the diagram owner and need edit access. The view-only `url` is for sharing with others.

## Read a diagram

```bash
curl https://mermaidsh.com/api/d/{id}
```

Response:

```json
{
  "id": "abc123",
  "title": "My Diagram",
  "version": 3,
  "content": "graph TD; A-->B; B-->C; C-->D",
  "createdAt": "2025-01-15T10:30:00Z",
  "versions": [
    { "version": 1, "content": "graph TD; A-->B", "createdAt": "2025-01-15T10:00:00Z" },
    { "version": 2, "content": "graph TD; A-->B; B-->C", "createdAt": "2025-01-15T10:15:00Z" },
    { "version": 3, "content": "graph TD; A-->B; B-->C; C-->D", "createdAt": "2025-01-15T10:30:00Z" }
  ],
  "skill": "https://mermaidsh.com/api/d/abc123/skill"
}
```

The `content` field returns the latest version. The `versions` array contains every version with its content and timestamp.

## Read a specific version

Append `?v=N` to fetch a particular version:

```bash
curl https://mermaidsh.com/api/d/{id}?v=2
```

The `content` field will contain version 2's content. The `versions` array still returns all versions.

## Update a diagram

```bash
curl -X PUT https://mermaidsh.com/api/d/{id} \
  -H "Authorization: Bearer {secret}" \
  -H "Content-Type: text/plain" \
  -d 'graph TD
    A[Start] --> B[Updated]
    B --> C[End]'
```

Each update creates a new version. Previous versions are always preserved.

## Share with another agent

Fetch a ready-to-use Agent Skill for any diagram:

```bash
# View-only skill
curl https://mermaidsh.com/api/d/{id}/skill

# Contribute skill (includes edit secret)
curl https://mermaidsh.com/api/d/{id}/skill?secret={secret}
```

Save the response as `.agents/skills/mermaid-{id}/SKILL.md` in the target project.
Any agent that supports the [Agent Skills](https://agentskills.io) format will discover it automatically.

## Tips

- Every update is versioned — nothing is lost
- You can set a title: `-H "Content-Type: application/json" -d '{"content": "...", "title": "My Diagram"}'`
- Mermaid syntax reference: https://mermaid.js.org/intro/syntax-reference.html
