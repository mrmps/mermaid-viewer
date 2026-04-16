#!/usr/bin/env node

import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

// ── Config ──────────────────────────────────────────────────────────

const BASE_URL = process.env.MERMAIDSH_URL ?? "https://merm.sh";
const CONFIG_DIR = join(homedir(), ".config", "mermaidsh");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface DiagramEntry {
  id: string;
  editId: string;
  secret: string;
  title?: string;
  createdAt: string;
}

interface Config {
  diagrams: Record<string, DiagramEntry>;
}

function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return { diagrams: {} };
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return { diagrams: {} };
  }
}

function saveConfig(config: Config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

function saveSecret(id: string, entry: DiagramEntry) {
  const config = loadConfig();
  config.diagrams[id] = entry;
  saveConfig(config);
}

function getSecret(id: string): string | undefined {
  return loadConfig().diagrams[id]?.secret;
}

// ── Colors ──────────────────────────────────────────────────────────

const noColor = process.env.NO_COLOR !== undefined;
const c = {
  reset: noColor ? "" : "\x1b[0m",
  bold: noColor ? "" : "\x1b[1m",
  dim: noColor ? "" : "\x1b[2m",
  green: noColor ? "" : "\x1b[32m",
  cyan: noColor ? "" : "\x1b[36m",
  yellow: noColor ? "" : "\x1b[33m",
  red: noColor ? "" : "\x1b[31m",
  gray: noColor ? "" : "\x1b[90m",
};

// ── Helpers ─────────────────────────────────────────────────────────

function readInput(file?: string): string {
  if (file) {
    if (!existsSync(file)) {
      console.error(`${c.red}Error:${c.reset} File not found: ${file}`);
      process.exit(1);
    }
    return readFileSync(file, "utf-8");
  }

  // Read from stdin
  if (process.stdin.isTTY) {
    console.error(
      `${c.red}Error:${c.reset} No file provided and stdin is a terminal.`
    );
    console.error(`  Pipe content: ${c.dim}echo "graph TD; A-->B" | mermaidsh create${c.reset}`);
    console.error(`  Or pass a file: ${c.dim}mermaidsh create diagram.mmd${c.reset}`);
    process.exit(1);
  }

  return readFileSync(0, "utf-8");
}

function openBrowser(url: string) {
  const platform = process.platform;
  try {
    if (platform === "darwin") execSync(`open "${url}"`);
    else if (platform === "win32") execSync(`start "" "${url}"`);
    else execSync(`xdg-open "${url}"`);
  } catch {
    console.log(`  Open: ${url}`);
  }
}

async function api(
  path: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: any }> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, options);
  } catch (err: any) {
    const cause = err?.cause?.code ?? err?.code ?? "";
    if (cause === "ENOTFOUND" || cause === "ECONNREFUSED") {
      die(`Cannot reach ${BASE_URL} — check your connection or MERMAIDSH_URL`);
    }
    die(`Network error: ${err?.message ?? err}`);
  }
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

function die(msg: string): never {
  console.error(`${c.red}Error:${c.reset} ${msg}`);
  process.exit(1);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

// ── Commands ────────────────────────────────────────────────────────

async function cmdCreate(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      title: { type: "string", short: "t" },
      json: { type: "boolean" },
    },
    allowPositionals: true,
  });

  const content = readInput(positionals[0]);
  const body: any = { content };
  if (values.title) body.title = values.title;

  const { ok, data } = await api("/api/d", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!ok) die(data.message ?? "Failed to create diagram");

  // Save secret locally
  saveSecret(data.id, {
    id: data.id,
    editId: data.editId,
    secret: data.secret,
    title: values.title,
    createdAt: new Date().toISOString(),
  });

  if (values.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`\n${c.green}${c.bold}Diagram created${c.reset}\n`);
  console.log(`  ${c.bold}ID:${c.reset}       ${data.id}`);
  console.log(`  ${c.bold}View:${c.reset}     ${data.url}`);
  console.log(`  ${c.bold}Edit:${c.reset}     ${data.editUrl}`);
  console.log(`  ${c.bold}Version:${c.reset}  ${data.version}`);
  console.log(
    `\n  ${c.dim}Secret saved to ${CONFIG_FILE}${c.reset}`
  );
  console.log(
    `  ${c.dim}Push updates with: mermaidsh push ${data.id} <file>${c.reset}\n`
  );
}

async function cmdGet(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      version: { type: "string", short: "v" },
      json: { type: "boolean" },
      raw: { type: "boolean", short: "r" },
    },
    allowPositionals: true,
  });

  const id = positionals[0];
  if (!id) die("Usage: mermaidsh get <id> [-v version] [--raw] [--json]");

  const vParam = values.version ? `?v=${values.version}` : "";
  const { ok, data } = await api(`/api/d/${id}${vParam}`);

  if (!ok) die(data.message ?? "Diagram not found");

  if (values.raw) {
    process.stdout.write(data.content);
    return;
  }

  if (values.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`\n${c.bold}${data.title ?? "Untitled"}${c.reset} ${c.dim}(${id})${c.reset}\n`);
  console.log(`  ${c.bold}Version:${c.reset}  ${data.version} of ${data.versions.length}`);
  console.log(`  ${c.bold}Created:${c.reset}  ${formatDate(data.createdAt)}`);
  console.log(`  ${c.bold}URL:${c.reset}      ${BASE_URL}/d/${id}`);
  console.log(`\n${c.cyan}${data.content}${c.reset}\n`);
}

async function cmdPush(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      title: { type: "string", short: "t" },
      secret: { type: "string", short: "s" },
      json: { type: "boolean" },
    },
    allowPositionals: true,
  });

  const id = positionals[0];
  if (!id) die("Usage: mermaidsh push <id> [file] [-t title] [-s secret]");

  const secret = values.secret ?? getSecret(id);
  if (!secret) {
    die(
      `No secret found for ${id}. Pass one with --secret or create the diagram with this CLI first.`
    );
  }

  const content = readInput(positionals[1]);
  const body: any = { content, secret };
  if (values.title) body.title = values.title;

  const { ok, data } = await api(`/api/d/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!ok) die(data.message ?? "Failed to update diagram");

  // Update local config with new title if provided
  const config = loadConfig();
  if (config.diagrams[id]) {
    if (values.title) config.diagrams[id].title = values.title;
    saveConfig(config);
  }

  if (values.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`\n${c.green}${c.bold}Pushed v${data.version}${c.reset} ${c.dim}→ ${data.url}${c.reset}\n`);
}

async function cmdOpen(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      edit: { type: "boolean", short: "e" },
    },
    allowPositionals: true,
  });

  const id = positionals[0];
  if (!id) die("Usage: mermaidsh open <id> [--edit]");

  if (values.edit) {
    const config = loadConfig();
    const entry = config.diagrams[id];
    if (!entry?.editId) {
      die(
        `No edit URL found for ${id}. You can only open edit URLs for diagrams you created.`
      );
    }
    openBrowser(`${BASE_URL}/e/${entry.editId}`);
    console.log(`${c.dim}Opened edit URL in browser${c.reset}`);
  } else {
    openBrowser(`${BASE_URL}/d/${id}`);
    console.log(`${c.dim}Opened ${BASE_URL}/d/${id} in browser${c.reset}`);
  }
}

async function cmdVersions(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      json: { type: "boolean" },
    },
    allowPositionals: true,
  });

  const id = positionals[0];
  if (!id) die("Usage: mermaidsh versions <id>");

  const { ok, data } = await api(`/api/d/${id}`);
  if (!ok) die(data.message ?? "Diagram not found");

  if (values.json) {
    console.log(JSON.stringify(data.versions, null, 2));
    return;
  }

  console.log(`\n${c.bold}${data.title ?? "Untitled"}${c.reset} ${c.dim}— ${data.versions.length} version(s)${c.reset}\n`);

  for (const v of data.versions) {
    const current = v.version === data.version ? ` ${c.green}← current${c.reset}` : "";
    const preview = v.content.split("\n")[0].slice(0, 60);
    console.log(
      `  ${c.bold}v${v.version}${c.reset}  ${c.dim}${formatDate(v.createdAt)}${c.reset}${current}`
    );
    console.log(`      ${c.gray}${preview}${c.reset}`);
  }
  console.log();
}

async function cmdList() {
  const config = loadConfig();
  const entries = Object.values(config.diagrams);

  if (entries.length === 0) {
    console.log(`\n${c.dim}No diagrams tracked yet. Create one with: mermaidsh create <file>${c.reset}\n`);
    return;
  }

  console.log(`\n${c.bold}Tracked diagrams${c.reset} ${c.dim}(${entries.length})${c.reset}\n`);

  for (const e of entries) {
    console.log(
      `  ${c.bold}${e.id}${c.reset}  ${e.title ?? c.dim + "Untitled" + c.reset}  ${c.dim}${formatDate(e.createdAt)}${c.reset}`
    );
    console.log(`      ${c.dim}${BASE_URL}/d/${e.id}${c.reset}`);
  }
  console.log();
}

async function cmdConfig() {
  console.log(`\n${c.bold}Config${c.reset}\n`);
  console.log(`  ${c.bold}File:${c.reset}     ${CONFIG_FILE}`);
  console.log(`  ${c.bold}API:${c.reset}      ${BASE_URL}`);

  const config = loadConfig();
  const count = Object.keys(config.diagrams).length;
  console.log(`  ${c.bold}Diagrams:${c.reset} ${count} tracked\n`);
}

// ── Help ────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${c.bold}mermaidsh${c.reset} — Mermaid diagrams from the terminal

${c.bold}Usage:${c.reset}
  mermaidsh <command> [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}create${c.reset} [file] [-t title]           Create a diagram from file or stdin
  ${c.cyan}get${c.reset} <id> [-v N] [--raw] [--json]   Fetch a diagram
  ${c.cyan}push${c.reset} <id> [file] [-t title]         Push a new version
  ${c.cyan}open${c.reset} <id> [--edit]                  Open in browser
  ${c.cyan}versions${c.reset} <id>                       List version history
  ${c.cyan}list${c.reset}                                List locally tracked diagrams
  ${c.cyan}config${c.reset}                              Show config info

${c.bold}Examples:${c.reset}
  ${c.dim}# Create from file${c.reset}
  mermaidsh create flowchart.mmd -t "Auth Flow"

  ${c.dim}# Create from stdin${c.reset}
  echo "graph TD; A-->B" | mermaidsh create

  ${c.dim}# Get raw content (pipe-friendly)${c.reset}
  mermaidsh get abc123 --raw > diagram.mmd

  ${c.dim}# Push update${c.reset}
  mermaidsh push abc123 updated.mmd

  ${c.dim}# Open specific version in browser${c.reset}
  mermaidsh open abc123

${c.bold}Environment:${c.reset}
  MERMAIDSH_URL    Override API base URL (default: https://merm.sh)
  NO_COLOR         Disable colored output

${c.dim}https://merm.sh${c.reset}
`);
}

// ── Main ────────────────────────────────────────────────────────────

const command = process.argv[2];
const rest = process.argv.slice(3);

switch (command) {
  case "create":
  case "new":
    await cmdCreate(rest);
    break;
  case "get":
  case "fetch":
  case "show":
    await cmdGet(rest);
    break;
  case "push":
  case "update":
    await cmdPush(rest);
    break;
  case "open":
  case "view":
    await cmdOpen(rest);
    break;
  case "versions":
  case "history":
    await cmdVersions(rest);
    break;
  case "list":
  case "ls":
    await cmdList();
    break;
  case "config":
  case "whoami":
    await cmdConfig();
    break;
  case "help":
  case "--help":
  case "-h":
  case undefined:
    printHelp();
    break;
  case "--version":
  case "-V":
    console.log("1.0.0");
    break;
  default:
    console.error(`${c.red}Unknown command:${c.reset} ${command}\n`);
    printHelp();
    process.exit(1);
}
