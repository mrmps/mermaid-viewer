import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mermaid-viewer/db"],
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
    ];
  },
};

export default nextConfig;
