import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  className?: string;
}

export function KpiCard({ icon: Icon, label, value, delta, deltaPositive, className }: KpiCardProps) {
  return (
    <div className={cn("bg-card border border-border rounded-lg shadow-sm p-5 flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex items-center justify-center h-9 w-9 rounded-sm bg-brand-tint text-brand">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold tabular-nums num">{value}</span>
        {delta && (
          <span className={cn("text-xs font-medium mb-0.5", deltaPositive ? "text-success-text" : "text-danger-text")}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
