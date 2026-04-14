import path from "node:path";
import { defineConfig } from "vitest/config";

const directory = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": directory,
      "@mermaid-viewer/db": path.resolve(directory, "../../packages/db/src"),
    },
  },
});
