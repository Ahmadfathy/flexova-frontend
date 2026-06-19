import { cn } from "@/lib/utils";

export type ProgressTone = "brand" | "success" | "warning" | "danger";

const FILL: Record<ProgressTone, string> = {
  brand:   "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
};

export interface ProgressRowProps {
  label: string;
  /** 0–100 */
  value: number;
  /** Formatted string shown at end (e.g. "74%" or "1,234 ج.م"). Falls back to `${value}%`. */
  displayValue?: string;
  tone?: ProgressTone;
  className?: string;
}

export function ProgressRow({
  label,
  value,
  displayValue,
  tone = "brand",
  className,
}: ProgressRowProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-foreground truncate">{label}</span>
        <span className="text-sm text-muted-foreground num shrink-0 tabular-nums">
          {displayValue ?? `${clamped}%`}
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-brand",
            FILL[tone]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
