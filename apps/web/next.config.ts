import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@mermaid-viewer/db"],
  serverExternalPackages: ["mermaid", "dompurify"],
  turbopack: {
    root: path.join(appDir, "../.."),
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/skills/default/skill.md",
        destination: "/api/skill",
      },
      {
        source: "/skill.md",
        destination: "/api/skill",
      },
      {
        source: "/install.md",
        destination: "/api/install",
      },
      {
        source: "/install.sh",
        destination: "/api/install-sh",
      },
      {
        source: "/llms.txt",
        destination: "/api/llms-txt",
      },
      {
        source: "/llms-full.txt",
        destination: "/api/llms-full-txt",
      },
    ];
  },
};

export default nextConfig;
