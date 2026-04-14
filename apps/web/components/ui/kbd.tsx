import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center rounded border px-1 py-0.5",
        "text-[11px] font-medium leading-none select-none",
        "border-border bg-muted text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}
