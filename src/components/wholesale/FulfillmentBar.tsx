import { cn } from "@/lib/utils";

interface FulfillmentBarProps {
  /** Delivered/picked percentage of the order (0-100). */
  pct: number;
  className?: string;
}

/** Picked/ordered progress bar for the orders list (FE_13 §4). */
export function FulfillmentBar({ pct, className }: FulfillmentBarProps) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div className={cn("flex items-center gap-2 min-w-[80px]", className)}>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            clamped >= 100 ? "bg-success" : clamped > 0 ? "bg-brand" : "bg-muted-foreground/30",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">{clamped}%</span>
    </div>
  );
}
