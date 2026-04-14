export default function Loading() {
  return (
    <main className="max-w-[692px] mx-auto w-full px-6 py-24 animate-pulse">
      <div className="h-4 w-16 rounded bg-muted mb-8" />
      <div className="flex items-baseline justify-between mb-6">
        <div className="h-8 w-40 rounded bg-muted" />
        <div className="h-4 w-16 rounded bg-muted/80" />
      </div>
      <div className="h-12 rounded-xl border border-border bg-muted/40 mb-5" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border bg-background overflow-hidden"
          >
            <div className="h-40 bg-muted/40" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-4 w-1/3 rounded bg-muted/80" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
