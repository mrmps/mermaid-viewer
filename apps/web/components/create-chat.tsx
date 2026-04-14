"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import { useModifierKeyLabel } from "@/lib/use-modifier-key-label";

export const INITIAL_CHAT_KEY = "mermaid-viewer-initial-chat";

type PromptExample = {
  title: string;
  description: string;
  prompt: string;
};

const PROMPT_EXAMPLES: PromptExample[] = [
  {
    title: "Error Budget Response",
    description:
      "A real engineering concept for deciding when feature velocity must slow down to protect reliability.",
    prompt: `Create a Mermaid flowchart that explains how an engineering team uses an error budget to make release decisions.

Represent:
- SLO target for a customer-facing API
- measured reliability over the last 30 days
- remaining error budget
- normal deploy cadence
- incident review
- freeze on risky launches
- reliability work such as rollback, scaling, and bug fixes
- return to normal release pace once budget recovers

Requirements:
1. Use a left-to-right flowchart.
2. Include decision nodes for:
   - is the SLO currently being met?
   - is the error budget nearly exhausted?
   - did a recent change materially increase incidents?
3. Make the tradeoff explicit between shipping features and protecting reliability.
4. End with either:
   - continue normal releases
   - enter reliability-first mode`,
  },
  {
    title: "Zone 2 Training Logic",
    description:
      "A genuinely useful health concept for balancing easy aerobic work, recovery, and harder sessions.",
    prompt: `Create a Mermaid diagram that explains how someone structures cardio training around Zone 2.

Include:
- current fitness goal
- resting fatigue and sleep quality
- easy Zone 2 session
- interval or threshold session
- strength training day
- recovery day
- weekly review of progress
- warning signs like unusually high heart rate, soreness, or poor sleep

Show how a person decides:
- when to stay in easy aerobic work
- when to add intensity
- when to back off for recovery
- how consistency builds endurance over time

Keep it practical and non-medical. Optimize for someone trying to understand the training principle, not a diagnosis.`,
  },
  {
    title: "Response Surface Area",
    description:
      "A useful but slightly niche engineering concept: reducing the blast radius of failures by shrinking what each request touches.",
    prompt: `Create a Mermaid architecture diagram that explains response surface area in a web product.

Include:
- browser client
- edge or load balancer
- application server
- primary database
- cache layer
- third-party API
- background worker
- observability system

Show two contrasting paths:
1. a narrow response path with cache hit and minimal dependencies
2. a wide response path that touches several services and is more failure-prone

Explain visually why wider response surface area increases latency variance, outage risk, and debugging complexity. Include one branch showing how moving non-critical work to async jobs improves resilience.`,
  },
  {
    title: "Decision Fatigue Load",
    description:
      "A practical life concept for showing how repeated small choices drain attention and make important decisions worse later in the day.",
    prompt: `Create a Mermaid flowchart that explains decision fatigue in everyday life.

Represent:
- morning planning
- shallow choices like messages, errands, and scheduling
- focused work block
- interruptions
- food, sleep, and stress effects
- end-of-day low-energy decisions
- habits or routines that reduce unnecessary choices

Include decision points for:
- is this choice important enough to deserve active thought?
- can this be automated, templated, or deferred?
- is energy too low to make a good call right now?

Show a healthier path where defaults, meal prep, calendar blocks, and routines preserve attention for the decisions that matter most.`,
  },
];

export function CreateChat() {
  const modifierKeyLabel = useModifierKeyLabel();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const handleSubmit = useCallback(async () => {
    const message = input.trim();
    if (!message || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "graph TD\n    A[Start]",
          title: "Untitled",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Request failed (${res.status})`);
      }
      const data = await res.json();

      sessionStorage.setItem(INITIAL_CHAT_KEY, message);
      router.push(`/e/${data.editId}?chat=true`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create diagram");
      setLoading(false);
    }
  }, [input, loading, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const handleExampleClick = useCallback((prompt: string) => {
    setInput(prompt);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      const end = prompt.length;
      textarea.setSelectionRange(end, end);
    });
  }, []);

  return (
    <div className="w-full space-y-4">
      <div
        className="relative w-full cursor-text"
        onClick={() => textareaRef.current?.focus()}
      >
        <div className="absolute inset-[-0.5px] rounded-[11px] bg-gradient-to-b from-border to-border/40 pointer-events-none" />

        <div
          className={cn(
            "relative flex rounded-[10px] bg-card overflow-hidden",
            "shadow-[0_4px_4px_-1px_rgba(0,0,0,0.04),0_1px_1px_rgba(0,0,0,0.08)]",
            "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.4)]"
          )}
        >
          <div className="flex flex-col flex-1 gap-2 p-3">
            <div className="flex flex-1 w-full px-1.5 py-0.5 min-h-[48px] max-h-[288px] overflow-y-auto">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe a diagram..."
                rows={1}
                disabled={loading}
                className={cn(
                  "w-full resize-none bg-transparent border-none",
                  "text-[15px] font-[450] leading-6 tracking-[-0.1px]",
                  "text-foreground/90 placeholder:text-muted-foreground/40 dark:placeholder:text-muted-foreground/60",
                  "focus:outline-none disabled:opacity-50"
                )}
                style={{ minHeight: "24px", maxHeight: "200px" }}
              />
            </div>

            {error && (
              <p className="px-0.5 text-[11px] text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex items-end justify-between w-full">
              <span className="flex items-center gap-1 select-none px-0.5 leading-6">
                <span className="flex items-center gap-0.5">
                  <Kbd>{modifierKeyLabel}</Kbd>
                  <Kbd>↵</Kbd>
                </span>
                <span className="text-[11px] text-muted-foreground">to send</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim() || loading}
                  aria-label="Create diagram"
                  className={cn(
                    "size-6 flex items-center justify-center rounded-full shrink-0 relative",
                    "border border-border/50",
                    "transition-all duration-150",
                    input.trim() && !loading
                      ? "bg-muted text-foreground/90 cursor-pointer hover:bg-muted/80 shadow-[0_0_0_0.5px_rgba(255,255,255,0.14),0_4px_4px_-1px_rgba(0,0,0,0.04),0_1px_1px_rgba(0,0,0,0.08)] dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/80"
                      : "bg-muted/30 text-muted-foreground pointer-events-none opacity-40"
                  )}
                >
                  {loading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <ArrowUp className="size-3.5" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border/70 bg-card/45">
        <div className="border-b border-border/60 px-4 py-2.5">
          <p className="text-xs font-medium text-muted-foreground">
            Example prompts
          </p>
        </div>

        <div className="p-1.5">
          {PROMPT_EXAMPLES.map((example) => (
            <button
              key={example.title}
              type="button"
              onClick={() => handleExampleClick(example.prompt)}
              className="group flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/40"
            >
              <span className="truncate text-sm text-foreground/80">
                {example.title}
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
