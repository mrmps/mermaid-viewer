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

## Read a diagram

```bash
curl https://mermaidsh.com/api/d/{id}
```

Returns `content` (mermaid source), `version`, and full `versions` array.

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
