import typescriptParser from "@typescript-eslint/parser";
import core from "ultracite/eslint/core";
import next from "ultracite/eslint/next";

const patchRules = (configs) =>
  configs.map((config) => {
    if (!config.rules) {
      return config;
    }

    const rules = { ...config.rules };
    delete rules["import-x/enforce-node-protocol-usage"];
    return { ...config, rules };
  });

export default [
  ...patchRules(core),
  ...patchRules(next),
  {
    files: ["**/*.tsx", "**/*.jsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: "./tsconfig.json",
      },
    },
  },
  {
    settings: {
      next: { rootDir: "apps/web" },
    },
  },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx", "**/*.mjs", "**/*.cjs"],
    rules: {
      "sonarjs/function-name": "off",
      "sonarjs/declarations-in-global-scope": "off",
      "sonarjs/file-header": "off",
      "sonarjs/file-name-differ-from-class": "off",
      "sonarjs/arrow-function-convention": "off",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/naming-convention": "off",
    },
  },
  {
    files: ["**/app/**/route.ts", "**/proxy.ts"],
    rules: {
      "func-style": "off",
    },
  },
  {
    files: ["**/lib/env.ts", "**/lib/utils.ts"],
    rules: {
      "unicorn/prevent-abbreviations": "off",
    },
  },
  {
    ignores: [
      "**/__tests__/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/packages/next-themes/**",
      "**/next-env.d.ts",
      "**/*.json",
    ],
  },
];
