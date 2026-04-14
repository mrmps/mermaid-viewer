import { ImageResponse } from "next/og";

export const alt = "mermaid-viewer — Versioned Mermaid Diagrams for AI Agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "#fafafa",
              letterSpacing: "-0.02em",
            }}
          >
            mermaid-viewer
          </span>
        </div>
        <p
          style={{
            fontSize: "28px",
            color: "#a1a1aa",
            margin: 0,
            maxWidth: "700px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Versioned Mermaid diagrams. One command to deploy.
        </p>
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "48px",
          }}
        >
          {["Create", "Version", "Share"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "12px",
                padding: "12px 24px",
                fontSize: "20px",
                color: "#a1a1aa",
              }}
            >
              <span style={{ color: "#a78bfa" }}>→</span> {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
