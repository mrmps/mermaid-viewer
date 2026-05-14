<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design Rules

- Use Display P3 colors when possible for richer, more precise UI color. Prefer CSS `color(display-p3 ...)` values when authoring custom colors, with practical sRGB fallbacks when needed.
- Avoid purple as the default palette or accent most of the time. Use it only when there is a clear product, semantic, or user-requested reason.
