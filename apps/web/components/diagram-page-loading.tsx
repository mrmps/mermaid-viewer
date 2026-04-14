export function DiagramPageLoading() {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground animate-pulse">
      <header className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-border bg-background">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-3 w-3 rounded bg-muted/70" />
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-4 w-8 rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-36 rounded-lg bg-muted" />
          <div className="h-7 w-24 rounded-full bg-muted" />
          <div className="h-7 w-7 rounded-lg bg-muted" />
          <div className="h-7 w-16 rounded-lg bg-muted" />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-52 shrink-0 border-r border-border bg-background p-3 space-y-2">
          <div className="h-3 w-16 rounded bg-muted mb-3" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/60 bg-muted/50 p-2 space-y-2"
            >
              <div className="aspect-[16/10] rounded-lg bg-muted" />
              <div className="flex items-center justify-between">
                <div className="h-3 w-10 rounded bg-muted" />
                <div className="h-3 w-12 rounded bg-muted/80" />
              </div>
            </div>
          ))}
        </aside>

        <main className="flex-1 min-w-0 bg-background p-6">
          <div className="h-full rounded-3xl border border-border/60 bg-muted/30" />
        </main>
      </div>
    </div>
  );
}
