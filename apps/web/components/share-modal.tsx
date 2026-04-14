"use client";

import { useState, useRef, useEffect } from "react";

type Tab = "person" | "agent";

export function ShareButton({
  diagramId,
  secret,
}: {
  diagramId: string;
  secret?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("person");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const viewUrl = `${origin}/d/${diagramId}`;
  const apiUrl = `${origin}/api/d/${diagramId}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer"
        style={{ background: "var(--accent)", color: "white" }}
      >
        Share
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            ref={modalRef}
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--bg-app)", border: "1px solid var(--border)" }}
          >
            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
              <TabButton active={tab === "person"} onClick={() => setTab("person")}>
                Share with a person
              </TabButton>
              <TabButton active={tab === "agent"} onClick={() => setTab("agent")}>
                Share with an agent
              </TabButton>
            </div>

            <div className="p-5">
              {tab === "person" ? (
                <PersonTab viewUrl={viewUrl} apiUrl={apiUrl} secret={secret} />
              ) : (
                <AgentTab diagramId={diagramId} apiUrl={apiUrl} secret={secret} />
              )}
            </div>

            <div className="px-5 pb-4 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors"
                style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        background: active ? "var(--bg-surface)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

function PersonTab({
  viewUrl,
  apiUrl,
  secret,
}: {
  viewUrl: string;
  apiUrl: string;
  secret?: string;
}) {
  return (
    <div className="space-y-5">
      {/* View link */}
      <div>
        <Label>View-only link</Label>
        <Desc>Anyone with this link can view the diagram and all versions.</Desc>
        <CopyBlock value={viewUrl} />
      </div>

      {secret && (
        <>
          {/* Collaborate link */}
          <div>
            <Label>Collaborate link</Label>
            <Desc>
              Share this with teammates who need to push updates. It includes the
              edit secret in the URL.
            </Desc>
            <CopyBlock value={`${viewUrl}?secret=${secret}`} />
          </div>

          {/* CLI command */}
          <div>
            <Label>Update from CLI</Label>
            <Desc>
              Give your collaborator this command. They just replace the diagram
              content.
            </Desc>
            <CopyBlock
              value={`curl -X PUT ${apiUrl} \\
  -H "Authorization: Bearer ${secret}" \\
  -H "Content-Type: text/plain" \\
  -d 'graph TD
    A[Your Diagram] --> B[Here]'`}
              multiline
            />
          </div>
        </>
      )}

      {!secret && (
        <div
          className="rounded-lg p-3 text-xs"
          style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}
        >
          You&apos;re viewing this diagram without edit access. To share edit
          access, use the edit URL you received when creating the diagram.
        </div>
      )}
    </div>
  );
}

function AgentTab({
  diagramId,
  apiUrl,
  secret,
}: {
  diagramId: string;
  apiUrl: string;
  secret?: string;
}) {
  const envBlock = secret
    ? `MERMAID_DIAGRAM_ID=${diagramId}
MERMAID_API_URL=${apiUrl}
MERMAID_SECRET=${secret}`
    : `MERMAID_DIAGRAM_ID=${diagramId}
MERMAID_API_URL=${apiUrl}`;

  const agentInstructions = secret
    ? `# Read current diagram
curl ${apiUrl}

# Update diagram (creates new version)
curl -X PUT ${apiUrl} \\
  -H "Authorization: Bearer ${secret}" \\
  -H "Content-Type: text/plain" \\
  -d 'YOUR_MERMAID_CONTENT'

# Response: { "id": "${diagramId}", "version": N }`
    : `# Read current diagram
curl ${apiUrl}

# Response includes all versions with content`;

  return (
    <div className="space-y-5">
      {/* Agent-readable config */}
      <div>
        <Label>Environment variables</Label>
        <Desc>
          Add these to your agent&apos;s environment or paste into the system
          prompt.
        </Desc>
        <CopyBlock value={envBlock} multiline />
      </div>

      {/* Commands */}
      <div>
        <Label>Agent commands</Label>
        <Desc>
          Give your agent these curl commands to read and update the diagram.
        </Desc>
        <CopyBlock value={agentInstructions} multiline />
      </div>

      {/* Structured JSON */}
      <div>
        <Label>Structured config (JSON)</Label>
        <Desc>For agents that prefer structured input.</Desc>
        <CopyBlock
          value={JSON.stringify(
            {
              diagram_id: diagramId,
              api_url: apiUrl,
              ...(secret ? { secret } : {}),
              endpoints: {
                read: `GET ${apiUrl}`,
                ...(secret
                  ? { update: `PUT ${apiUrl} (Authorization: Bearer <secret>)` }
                  : {}),
              },
            },
            null,
            2
          )}
          multiline
        />
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
      {children}
    </div>
  );
}

function Desc({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}

function CopyBlock({
  value,
  multiline,
}: {
  value: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <pre
        className={`text-xs font-mono rounded-lg p-3 overflow-x-auto ${
          multiline ? "whitespace-pre" : "whitespace-nowrap"
        }`}
        style={{
          background: "var(--bg-inset)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-subtle)",
          maxHeight: multiline ? "200px" : undefined,
        }}
      >
        {value}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
