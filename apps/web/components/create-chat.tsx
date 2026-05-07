"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowUpRight, Loader2, Workflow } from "lucide-react";
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

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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
    <div className="w-full">
      <form
        className="diagram-chatbar-frame cursor-text p-3"
        onClick={() => textareaRef.current?.focus()}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a diagram..."
          rows={2}
          disabled={loading}
          className={cn(
            "diagram-chatbar-textarea",
            loading && "cursor-not-allowed opacity-50"
          )}
          style={{ minHeight: "48px", maxHeight: "200px" }}
        />

        {error && (
          <p className="mt-2 px-1 text-[11px] text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-end justify-between gap-2 pt-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="diagram-chatbar-pill shrink-0">
              <Workflow className="size-3.5" />
              Mermaid
            </span>
            <span className="diagram-chatbar-pill hidden select-none sm:inline-flex">
              <Kbd>{modifierKeyLabel}</Kbd>
              <Kbd>↵</Kbd>
            </span>
          </div>

          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Create diagram"
            className="diagram-chatbar-send shrink-0"
            data-active={input.trim() && !loading ? "true" : "false"}
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <ArrowUp className="size-3.5" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {PROMPT_EXAMPLES.map((example) => (
          <button
            key={example.title}
            type="button"
            onClick={() => handleExampleClick(example.prompt)}
            className="diagram-chatbar-chip group"
          >
            <span>{example.title}</span>
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
