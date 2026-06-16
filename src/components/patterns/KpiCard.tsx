import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiTone = "brand" | "success" | "warning" | "danger" | "info";

const TONE: Record<KpiTone, { card: string; icon: string; text: string }> = {
  brand:   { card: "bg-brand-tint",   icon: "text-brand",        text: "text-brand-text" },
  success: { card: "bg-success-tint", icon: "text-success",      text: "text-success-text" },
  warning: { card: "bg-warning-tint", icon: "text-warning",      text: "text-warning-text" },
  danger:  { card: "bg-danger-tint",  icon: "text-danger",       text: "text-danger-text" },
  info:    { card: "bg-brand-tint",   icon: "text-brand",        text: "text-brand-text" },
};

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  tone?: KpiTone;
  className?: string;
}

export function KpiCard({
  icon: Icon, label, value, delta, deltaPositive, tone, className,
}: KpiCardProps) {
  const t = tone ? TONE[tone] : null;

  return (
    <div
      className={cn(
        "border rounded-lg shadow-sm p-5 flex flex-col gap-3 transition-colors",
        t ? `${t.card} border-transparent` : "bg-card border-border",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-medium", t ? t.text : "text-muted-foreground")}>
          {label}
        </span>
        <span
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-md",
            t ? "bg-white/40" : "bg-brand-tint"
          )}
        >
          <Icon className={cn("h-4 w-4", t ? t.icon : "text-brand")} />
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className={cn("text-2xl font-bold tabular-nums num", t ? t.text : "text-foreground")}>
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "text-xs font-medium mb-0.5",
              deltaPositive ? "text-success-text" : "text-danger-text"
            )}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
