import { ImageResponse } from "next/og";
import { getDiagram } from "@mermaid-viewer/db";

export const alt = "Mermaid diagram preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Theme palettes that match the app's themes
const THEME_PALETTES = {
  midnight: {
    bg: "#020617",
    surface: "#0f0e1a",
    accent: "#6366f1",
    accentAlt: "#818cf8",
    glow1: "rgba(99,102,241,0.25)",
    glow2: "rgba(139,92,246,0.15)",
    glow3: "rgba(59,130,246,0.12)",
    text: "#e0e7ff",
    textMuted: "#6366f1",
    codeBg: "#0c0b16",
    codeBorder: "#2e1f5e",
    codeText: "#a5b4fc",
    badge: "#1e1b4b",
    badgeText: "#a5b4fc",
    dot: "#6366f1",
  },
  forest: {
    bg: "#020c0b",
    surface: "#071a13",
    accent: "#22c55e",
    accentAlt: "#4ade80",
    glow1: "rgba(34,197,94,0.25)",
    glow2: "rgba(16,185,129,0.15)",
    glow3: "rgba(52,211,153,0.12)",
    text: "#dcfce7",
    textMuted: "#22c55e",
    codeBg: "#040f0a",
    codeBorder: "#14532d",
    codeText: "#86efac",
    badge: "#052e16",
    badgeText: "#86efac",
    dot: "#22c55e",
  },
  ocean: {
    bg: "#020617",
    surface: "#051525",
    accent: "#0ea5e9",
    accentAlt: "#38bdf8",
    glow1: "rgba(14,165,233,0.25)",
    glow2: "rgba(56,189,248,0.15)",
    glow3: "rgba(2,132,199,0.12)",
    text: "#e0f2fe",
    textMuted: "#0ea5e9",
    codeBg: "#03111f",
    codeBorder: "#0c4a6e",
    codeText: "#7dd3fc",
    badge: "#082f49",
    badgeText: "#7dd3fc",
    dot: "#0ea5e9",
  },
  mono: {
    bg: "#09090b",
    surface: "#111113",
    accent: "#a1a1aa",
    accentAlt: "#d4d4d8",
    glow1: "rgba(161,161,170,0.15)",
    glow2: "rgba(113,113,122,0.10)",
    glow3: "rgba(82,82,91,0.08)",
    text: "#e4e4e7",
    textMuted: "#71717a",
    codeBg: "#0c0c0e",
    codeBorder: "#27272a",
    codeText: "#a1a1aa",
    badge: "#18181b",
    badgeText: "#a1a1aa",
    dot: "#a1a1aa",
  },
  light: {
    bg: "#f8fafc",
    surface: "#ffffff",
    accent: "#3b82f6",
    accentAlt: "#60a5fa",
    glow1: "rgba(59,130,246,0.12)",
    glow2: "rgba(99,102,241,0.08)",
    glow3: "rgba(14,165,233,0.06)",
    text: "#0f172a",
    textMuted: "#3b82f6",
    codeBg: "#ffffff",
    codeBorder: "#e2e8f0",
    codeText: "#334155",
    badge: "#eff6ff",
    badgeText: "#2563eb",
    dot: "#3b82f6",
  },
};

// Pick a theme based on content hash for variety
function pickTheme(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const keys = Object.keys(THEME_PALETTES) as (keyof typeof THEME_PALETTES)[];
  return keys[Math.abs(hash) % keys.length];
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getDiagram({ id });

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#09090b",
            color: "#fafafa",
            fontSize: 48,
            fontFamily: "monospace",
          }}
        >
          Diagram not found
        </div>
      ),
      { ...size }
    );
  }

  const { diagram, currentVersion } = data;
  const title = diagram.title || "Untitled";
  const code = currentVersion.content;
  const version = currentVersion.version;
  const t = THEME_PALETTES[pickTheme(id)];

  // Truncate code for preview
  const codeLines = code.split("\n").slice(0, 10);
  const truncated = code.split("\n").length > 10;
  const codePreview = codeLines.join("\n") + (truncated ? "\n..." : "");

  // Detect diagram type
  const firstLine = code.trim().split("\n")[0].trim().toLowerCase();
  let diagramType = "diagram";
  if (firstLine.startsWith("graph") || firstLine.startsWith("flowchart"))
    diagramType = "flowchart";
  else if (firstLine.startsWith("sequencediagram")) diagramType = "sequence";
  else if (firstLine.startsWith("classdiagram")) diagramType = "class";
  else if (firstLine.startsWith("statediagram")) diagramType = "state";
  else if (firstLine.startsWith("erdiagram")) diagramType = "ER diagram";
  else if (firstLine.startsWith("gantt")) diagramType = "gantt";
  else if (firstLine.startsWith("pie")) diagramType = "pie chart";
  else if (firstLine.startsWith("gitgraph")) diagramType = "git graph";
  else if (firstLine.startsWith("journey")) diagramType = "journey";
  else if (firstLine.startsWith("mindmap")) diagramType = "mindmap";
  else if (firstLine.startsWith("timeline")) diagramType = "timeline";
  else if (firstLine.startsWith("c4")) diagramType = "C4";

  const lineCount = code.split("\n").length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "monospace",
          position: "relative",
          overflow: "hidden",
          background: t.bg,
        }}
      >
        {/* Multi-layered gradient background */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background: `radial-gradient(ellipse 80% 60% at 70% 10%, ${t.glow1} 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 20% 80%, ${t.glow2} 0%, transparent 50%), radial-gradient(ellipse 40% 40% at 50% 50%, ${t.glow3} 0%, transparent 60%)`,
          }}
        />

        {/* Decorative accent line at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            display: "flex",
            background: `linear-gradient(90deg, transparent 0%, ${t.accent} 30%, ${t.accentAlt} 60%, transparent 100%)`,
          }}
        />

        {/* Main content layout — left info, right code */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "40px",
            gap: "36px",
            position: "relative",
          }}
        >
          {/* Left column — branding + title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "420px",
              flexShrink: 0,
            }}
          >
            {/* Top section */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Branding */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: t.dot,
                    boxShadow: `0 0 12px ${t.glow1}`,
                    display: "flex",
                  }}
                />
                <span
                  style={{
                    fontSize: 15,
                    color: t.textMuted,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  mermaid-viewer
                </span>
              </div>

              {/* Title */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: "32px",
                }}
              >
                <h1
                  style={{
                    fontSize: title.length > 30 ? 36 : 44,
                    fontWeight: 700,
                    color: t.text,
                    margin: 0,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.1,
                  }}
                >
                  {title.length > 50 ? title.slice(0, 47) + "..." : title}
                </h1>
              </div>

              {/* Badges */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "24px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: t.badgeText,
                    background: t.badge,
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontWeight: 500,
                  }}
                >
                  {diagramType}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: t.badgeText,
                    background: t.badge,
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontWeight: 500,
                  }}
                >
                  v{version}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: t.badgeText,
                    background: t.badge,
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontWeight: 500,
                  }}
                >
                  {lineCount} lines
                </span>
              </div>
            </div>

            {/* Bottom — path */}
            <div style={{ display: "flex" }}>
              <span
                style={{
                  fontSize: 14,
                  color: t.textMuted,
                  opacity: 0.5,
                }}
              >
                /d/{id}
              </span>
            </div>
          </div>

          {/* Right column — code preview */}
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              background: t.codeBg,
              borderRadius: "16px",
              border: `1px solid ${t.codeBorder}`,
              overflow: "hidden",
              boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)`,
            }}
          >
            {/* Code window title bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: `1px solid ${t.codeBorder}`,
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  opacity: 0.7,
                  display: "flex",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#eab308",
                  opacity: 0.7,
                  display: "flex",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  opacity: 0.7,
                  display: "flex",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: t.codeText,
                  opacity: 0.4,
                  marginLeft: "8px",
                }}
              >
                diagram.mmd
              </span>
            </div>

            {/* Code content with line numbers */}
            <div
              style={{
                display: "flex",
                flex: 1,
                padding: "16px 0",
                overflow: "hidden",
              }}
            >
              {/* Line numbers */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "0 16px",
                  borderRight: `1px solid ${t.codeBorder}`,
                  alignItems: "flex-end",
                  flexShrink: 0,
                }}
              >
                {codeLines.map((line, i) => (
                  <span
                    key={`ln-${i + 1}`}
                    style={{
                      fontSize: 14,
                      lineHeight: "22px",
                      color: t.codeText,
                      opacity: 0.25,
                    }}
                  >
                    {i + 1}
                  </span>
                ))}
                {truncated && (
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: "22px",
                      color: t.codeText,
                      opacity: 0.15,
                    }}
                  >
                    ...
                  </span>
                )}
              </div>
              {/* Code text */}
              <pre
                style={{
                  fontSize: 14,
                  lineHeight: "22px",
                  color: t.codeText,
                  margin: 0,
                  padding: "0 20px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflow: "hidden",
                }}
              >
                {codePreview}
              </pre>
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2px",
            display: "flex",
            background: `linear-gradient(90deg, transparent 0%, ${t.accent}40 50%, transparent 100%)`,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
