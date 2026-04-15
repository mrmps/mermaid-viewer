const agents = [
  {
    name: "Cursor",
    light: "https://svgl.app/library/cursor_light.svg",
    dark: "https://svgl.app/library/cursor_dark.svg",
  },
  {
    name: "Claude Code",
    light: "https://svgl.app/library/anthropic_black.svg",
    dark: "https://svgl.app/library/anthropic_white.svg",
  },
  {
    name: "Windsurf",
    light: "https://svgl.app/library/windsurf-light.svg",
    dark: "https://svgl.app/library/windsurf-dark.svg",
  },
  {
    name: "Codex",
    light: "https://svgl.app/library/openai.svg",
    dark: "https://svgl.app/library/openai_dark.svg",
  },
  {
    name: "OpenClaw",
    light: "https://svgl.app/library/openclaw.svg",
    dark: "https://svgl.app/library/openclaw.svg",
  },
  {
    name: "opencode",
    light: "https://svgl.app/library/opencode.svg",
    dark: "https://svgl.app/library/opencode.svg",
  },
];

export function CompatibleAgents() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground">
        Compatible with any agent
      </p>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {agents.map((agent) => (
          <div key={agent.name} className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={agent.light}
              alt=""
              className="h-5 w-5 dark:hidden"
              loading="lazy"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={agent.dark}
              alt=""
              className="h-5 w-5 hidden dark:block"
              loading="lazy"
            />
            <span className="text-sm font-medium text-foreground">
              {agent.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
