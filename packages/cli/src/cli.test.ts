import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { execFile } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

// ── Mock HTTP server ───────────────────────────────────────────────

interface MockDiagram {
  id: string;
  editId: string;
  secret: string;
  title: string;
  versions: { version: number; content: string; createdAt: string }[];
}

const diagrams = new Map<string, MockDiagram>();
let nextId = 1;

function resetDiagrams() {
  diagrams.clear();
  nextId = 1;
}

function handleRequest(req: IncomingMessage, res: ServerResponse) {
  let body = "";
  req.on("data", (chunk: Buffer) => (body += chunk));
  req.on("end", () => {
    const url = new URL(req.url!, `http://localhost`);

    // POST /api/d — create
    if (req.method === "POST" && url.pathname === "/api/d") {
      const data = JSON.parse(body);
      const id = `test${nextId++}`;
      const editId = `edit${id}`;
      const secret = `secret${id}`;
      const now = new Date().toISOString();
      const diagram: MockDiagram = {
        id,
        editId,
        secret,
        title: data.title ?? "Untitled",
        versions: [{ version: 1, content: data.content, createdAt: now }],
      };
      diagrams.set(id, diagram);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id,
          editId,
          url: `http://localhost/d/${id}`,
          editUrl: `http://localhost/e/${editId}`,
          secret,
          version: 1,
          skill: `http://localhost/api/d/${id}/skill`,
        }),
      );
      return;
    }

    // GET /api/d/:id — fetch
    const getMatch = url.pathname.match(/^\/api\/d\/([^/]+)$/);
    if (req.method === "GET" && getMatch) {
      const diagram = diagrams.get(getMatch[1]);
      if (!diagram) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Not found" }));
        return;
      }
      const v = url.searchParams.get("v");
      const ver = v
        ? diagram.versions.find((x) => x.version === Number(v))
        : diagram.versions[diagram.versions.length - 1];
      if (!ver) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Version not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: diagram.id,
          title: diagram.title,
          version: ver.version,
          content: ver.content,
          createdAt: ver.createdAt,
          versions: diagram.versions,
          skill: `http://localhost/api/d/${diagram.id}/skill`,
        }),
      );
      return;
    }

    // PUT /api/d/:id — update
    const putMatch = url.pathname.match(/^\/api\/d\/([^/]+)$/);
    if (req.method === "PUT" && putMatch) {
      const diagram = diagrams.get(putMatch[1]);
      if (!diagram) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Not found" }));
        return;
      }
      const data = JSON.parse(body);
      const auth =
        data.secret ??
        data.editId ??
        req.headers.authorization?.replace("Bearer ", "");
      if (auth !== diagram.secret && auth !== diagram.editId) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Unauthorized" }));
        return;
      }
      const newVersion = diagram.versions.length + 1;
      diagram.versions.push({
        version: newVersion,
        content: data.content,
        createdAt: new Date().toISOString(),
      });
      if (data.title) diagram.title = data.title;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: diagram.id,
          url: `http://localhost/d/${diagram.id}`,
          version: newVersion,
          skill: `http://localhost/api/d/${diagram.id}/skill`,
        }),
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Not found" }));
  });
}

// ── Test helpers ───────────────────────────────────────────────────

const CLI = join(import.meta.dirname, "..", "dist", "index.js");
let serverUrl: string;
let server: ReturnType<typeof createServer>;
let configDir: string;

function run(
  args: string[],
  opts?: { stdin?: string; env?: Record<string, string> },
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = execFile(
      "node",
      [CLI, ...args],
      {
        env: {
          ...process.env,
          MERMAIDSH_URL: serverUrl,
          HOME: configDir,
          NO_COLOR: "1",
          ...opts?.env,
        },
        timeout: 10_000,
      },
      (error, stdout, stderr) => {
        resolve({
          code: error?.code !== undefined ? (error.code as unknown as number) : 0,
          stdout: stdout.toString(),
          stderr: stderr.toString(),
        });
      },
    );
    if (opts?.stdin !== undefined) {
      child.stdin!.write(opts.stdin);
      child.stdin!.end();
    }
  });
}

// ── Setup / teardown ───────────────────────────────────────────────

beforeAll(async () => {
  server = createServer(handleRequest);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as { port: number };
  serverUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  resetDiagrams();
  configDir = mkdtempSync(join(tmpdir(), "mermaidsh-test-"));
});

// ── Tests ──────────────────────────────────────────────────────────

describe("help & version", () => {
  it("prints help with no args", async () => {
    const { stdout, code } = await run([]);
    expect(code).toBe(0);
    expect(stdout).toContain("mermaidsh");
    expect(stdout).toContain("Commands:");
    expect(stdout).toContain("create");
  });

  it("prints help with --help", async () => {
    const { stdout, code } = await run(["--help"]);
    expect(code).toBe(0);
    expect(stdout).toContain("Commands:");
  });

  it("prints version with --version", async () => {
    const { stdout, code } = await run(["--version"]);
    expect(code).toBe(0);
    expect(stdout.trim()).toBe("1.0.0");
  });

  it("exits 1 on unknown command", async () => {
    const { code, stderr } = await run(["nonexistent"]);
    expect(code).toBe(1);
    expect(stderr).toContain("Unknown command");
  });
});

describe("create", () => {
  it("creates from stdin", async () => {
    const { stdout, code } = await run(["create"], {
      stdin: "graph TD; A-->B",
    });
    expect(code).toBe(0);
    expect(stdout).toContain("Diagram created");
    expect(stdout).toContain("test1");
  });

  it("creates from stdin with title", async () => {
    const { stdout, code } = await run(["create", "-t", "My Flow"], {
      stdin: "graph TD; A-->B",
    });
    expect(code).toBe(0);
    expect(stdout).toContain("Diagram created");
  });

  it("creates from file", async () => {
    const file = join(configDir, "diagram.mmd");
    writeFileSync(file, "graph TD; X-->Y");
    const { stdout, code } = await run(["create", file]);
    expect(code).toBe(0);
    expect(stdout).toContain("Diagram created");
  });

  it("creates with --json output", async () => {
    const { stdout, code } = await run(["create", "--json"], {
      stdin: "graph TD; A-->B",
    });
    expect(code).toBe(0);
    const json = JSON.parse(stdout);
    expect(json.id).toBe("test1");
    expect(json.secret).toBeTruthy();
    expect(json.version).toBe(1);
  });

  it("errors on missing file", async () => {
    const { code, stderr } = await run(["create", "/nonexistent.mmd"]);
    expect(code).toBe(1);
    expect(stderr).toContain("File not found");
  });

  it("saves secret to config", async () => {
    await run(["create", "--json"], { stdin: "graph TD; A-->B" });
    const configFile = join(configDir, ".config", "mermaidsh", "config.json");
    expect(existsSync(configFile)).toBe(true);
    const config = JSON.parse(readFileSync(configFile, "utf-8"));
    expect(config.diagrams.test1).toBeTruthy();
    expect(config.diagrams.test1.secret).toBe("secrettest1");
  });

  it("supports 'new' alias", async () => {
    const { stdout, code } = await run(["new", "--json"], {
      stdin: "graph TD; A-->B",
    });
    expect(code).toBe(0);
    expect(JSON.parse(stdout).id).toBe("test1");
  });
});

describe("get", () => {
  it("fetches a diagram", async () => {
    // Create one first
    await run(["create", "--json"], { stdin: "graph TD; A-->B" });
    const { stdout, code } = await run(["get", "test1"]);
    expect(code).toBe(0);
    expect(stdout).toContain("graph TD; A-->B");
  });

  it("fetches with --raw", async () => {
    await run(["create", "--json"], { stdin: "graph TD; A-->B" });
    const { stdout, code } = await run(["get", "test1", "--raw"]);
    expect(code).toBe(0);
    expect(stdout).toBe("graph TD; A-->B");
  });

  it("fetches with --json", async () => {
    await run(["create", "--json"], { stdin: "graph TD; A-->B" });
    const { stdout, code } = await run(["get", "test1", "--json"]);
    expect(code).toBe(0);
    const json = JSON.parse(stdout);
    expect(json.id).toBe("test1");
    expect(json.content).toBe("graph TD; A-->B");
    expect(json.version).toBe(1);
  });

  it("fetches specific version", async () => {
    await run(["create", "--json"], { stdin: "graph TD; v1" });
    await run(["push", "test1"], { stdin: "graph TD; v2" });
    const { stdout, code } = await run(["get", "test1", "-v", "1", "--raw"]);
    expect(code).toBe(0);
    expect(stdout).toBe("graph TD; v1");
  });

  it("errors without id", async () => {
    const { code, stderr } = await run(["get"]);
    expect(code).toBe(1);
    expect(stderr).toContain("Usage:");
  });

  it("errors on not found", async () => {
    const { code, stderr } = await run(["get", "nonexistent"]);
    expect(code).toBe(1);
    expect(stderr).toContain("Not found");
  });

  it("supports 'fetch' alias", async () => {
    await run(["create", "--json"], { stdin: "graph TD; A-->B" });
    const { stdout, code } = await run(["fetch", "test1", "--raw"]);
    expect(code).toBe(0);
    expect(stdout).toBe("graph TD; A-->B");
  });
});

describe("push", () => {
  it("pushes a new version from stdin", async () => {
    await run(["create", "--json"], { stdin: "graph TD; v1" });
    const { stdout, code } = await run(["push", "test1"], {
      stdin: "graph TD; v2",
    });
    expect(code).toBe(0);
    expect(stdout).toContain("Pushed v2");
  });

  it("pushes a new version from file", async () => {
    await run(["create", "--json"], { stdin: "graph TD; v1" });
    const file = join(configDir, "updated.mmd");
    writeFileSync(file, "graph TD; v2-file");
    const { stdout, code } = await run(["push", "test1", file]);
    expect(code).toBe(0);
    expect(stdout).toContain("Pushed v2");
  });

  it("pushes with explicit secret", async () => {
    // Create without saving (use a fresh config dir)
    const freshDir = mkdtempSync(join(tmpdir(), "mermaidsh-fresh-"));
    await run(["create", "--json"], { stdin: "graph TD; v1" });
    const { stdout, code } = await run(
      ["push", "test1", "-s", "secrettest1"],
      { stdin: "graph TD; v2", env: { HOME: freshDir } },
    );
    expect(code).toBe(0);
    expect(stdout).toContain("Pushed v2");
    rmSync(freshDir, { recursive: true });
  });

  it("pushes with --json output", async () => {
    await run(["create", "--json"], { stdin: "graph TD; v1" });
    const { stdout, code } = await run(["push", "test1", "--json"], {
      stdin: "graph TD; v2",
    });
    expect(code).toBe(0);
    const json = JSON.parse(stdout);
    expect(json.version).toBe(2);
    expect(json.id).toBe("test1");
  });

  it("errors without id", async () => {
    const { code, stderr } = await run(["push"]);
    expect(code).toBe(1);
    expect(stderr).toContain("Usage:");
  });

  it("errors without secret", async () => {
    const freshDir = mkdtempSync(join(tmpdir(), "mermaidsh-no-secret-"));
    const { code, stderr } = await run(["push", "test1"], {
      stdin: "graph TD; v2",
      env: { HOME: freshDir },
    });
    expect(code).toBe(1);
    expect(stderr).toContain("No secret found");
    rmSync(freshDir, { recursive: true });
  });

  it("supports 'update' alias", async () => {
    await run(["create", "--json"], { stdin: "graph TD; v1" });
    const { stdout, code } = await run(["update", "test1", "--json"], {
      stdin: "graph TD; v2",
    });
    expect(code).toBe(0);
    expect(JSON.parse(stdout).version).toBe(2);
  });
});

describe("versions", () => {
  it("lists version history", async () => {
    await run(["create"], { stdin: "graph TD; v1" });
    await run(["push", "test1"], { stdin: "graph TD; v2" });
    await run(["push", "test1"], { stdin: "graph TD; v3" });
    const { stdout, code } = await run(["versions", "test1"]);
    expect(code).toBe(0);
    expect(stdout).toContain("v1");
    expect(stdout).toContain("v2");
    expect(stdout).toContain("v3");
    expect(stdout).toContain("3 version(s)");
    expect(stdout).toContain("current");
  });

  it("lists versions with --json", async () => {
    await run(["create"], { stdin: "graph TD; v1" });
    await run(["push", "test1"], { stdin: "graph TD; v2" });
    const { stdout, code } = await run(["versions", "test1", "--json"]);
    expect(code).toBe(0);
    const json = JSON.parse(stdout);
    expect(json).toHaveLength(2);
    expect(json[0].version).toBe(1);
    expect(json[1].version).toBe(2);
  });

  it("errors without id", async () => {
    const { code, stderr } = await run(["versions"]);
    expect(code).toBe(1);
    expect(stderr).toContain("Usage:");
  });

  it("supports 'history' alias", async () => {
    await run(["create"], { stdin: "graph TD; v1" });
    const { stdout, code } = await run(["history", "test1"]);
    expect(code).toBe(0);
    expect(stdout).toContain("1 version(s)");
  });
});

describe("list", () => {
  it("shows empty state", async () => {
    const { stdout, code } = await run(["list"]);
    expect(code).toBe(0);
    expect(stdout).toContain("No diagrams tracked");
  });

  it("lists tracked diagrams", async () => {
    await run(["create", "-t", "First"], { stdin: "graph TD; A-->B" });
    await run(["create", "-t", "Second"], { stdin: "graph LR; X-->Y" });
    const { stdout, code } = await run(["list"]);
    expect(code).toBe(0);
    expect(stdout).toContain("2");
    expect(stdout).toContain("test1");
    expect(stdout).toContain("test2");
    expect(stdout).toContain("First");
    expect(stdout).toContain("Second");
  });

  it("supports 'ls' alias", async () => {
    const { stdout, code } = await run(["ls"]);
    expect(code).toBe(0);
    expect(stdout).toContain("No diagrams tracked");
  });
});

describe("config", () => {
  it("shows config info", async () => {
    const { stdout, code } = await run(["config"]);
    expect(code).toBe(0);
    expect(stdout).toContain("Config");
    expect(stdout).toContain("config.json");
    expect(stdout).toContain(serverUrl);
  });

  it("shows diagram count", async () => {
    await run(["create"], { stdin: "graph TD; A-->B" });
    await run(["create"], { stdin: "graph TD; C-->D" });
    const { stdout, code } = await run(["config"]);
    expect(code).toBe(0);
    expect(stdout).toContain("2 tracked");
  });

  it("supports 'whoami' alias", async () => {
    const { stdout, code } = await run(["whoami"]);
    expect(code).toBe(0);
    expect(stdout).toContain("Config");
  });
});

describe("NO_COLOR", () => {
  it("strips ANSI codes when NO_COLOR is set", async () => {
    const { stdout } = await run(["--help"]);
    // NO_COLOR is always set in our test runner
    expect(stdout).not.toContain("\x1b[");
  });
});

describe("end-to-end workflow", () => {
  it("create → push → get → versions round-trip", async () => {
    // Create
    const createResult = await run(["create", "-t", "E2E Test", "--json"], {
      stdin: "graph TD; Start-->End",
    });
    expect(createResult.code).toBe(0);
    const created = JSON.parse(createResult.stdout);
    expect(created.id).toBe("test1");

    // Push v2
    const pushResult = await run(["push", created.id, "--json"], {
      stdin: "graph TD; Start-->Middle-->End",
    });
    expect(pushResult.code).toBe(0);
    expect(JSON.parse(pushResult.stdout).version).toBe(2);

    // Push v3
    const push2Result = await run(["push", created.id, "--json"], {
      stdin: "graph TD; A-->B-->C-->D",
    });
    expect(push2Result.code).toBe(0);
    expect(JSON.parse(push2Result.stdout).version).toBe(3);

    // Get latest
    const getResult = await run(["get", created.id, "--raw"]);
    expect(getResult.code).toBe(0);
    expect(getResult.stdout).toBe("graph TD; A-->B-->C-->D");

    // Get v1
    const getV1 = await run(["get", created.id, "-v", "1", "--raw"]);
    expect(getV1.code).toBe(0);
    expect(getV1.stdout).toBe("graph TD; Start-->End");

    // Versions
    const versionsResult = await run([
      "versions",
      created.id,
      "--json",
    ]);
    expect(versionsResult.code).toBe(0);
    const versions = JSON.parse(versionsResult.stdout);
    expect(versions).toHaveLength(3);

    // List
    const listResult = await run(["list"]);
    expect(listResult.code).toBe(0);
    expect(listResult.stdout).toContain("E2E Test");
    expect(listResult.stdout).toContain("1");
  });
});
