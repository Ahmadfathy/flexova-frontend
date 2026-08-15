import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Domain-specific variants (backward-compat) + generic semantic variants.
 * Generic variants map 1:1 to semantic tint tokens and work across all modules.
 */
export type PillVariant =
  // domain aliases (legacy)
  | "paid" | "credit" | "sent" | "rejected"
  // generic semantic
  | "approved" | "pending" | "in-progress" | "active" | "inactive"
  | "default";

const PILL: Record<PillVariant, { bg: string; text: string; dot: string }> = {
  // ── domain aliases ─────────────────────────────────────────
  paid:        { bg: "bg-success-tint", text: "text-success-text", dot: "bg-success" },
  credit:      { bg: "bg-warning-tint", text: "text-warning-text", dot: "bg-warning" },
  sent:        { bg: "bg-brand-tint",   text: "text-brand-text",   dot: "bg-brand"   },
  rejected:    { bg: "bg-danger-tint",  text: "text-danger-text",  dot: "bg-danger"  },
  // ── generic semantic ────────────────────────────────────────
  approved:    { bg: "bg-success-tint", text: "text-success-text", dot: "bg-success" },
  pending:     { bg: "bg-warning-tint", text: "text-warning-text", dot: "bg-warning" },
  "in-progress":{ bg: "bg-warning-tint",text: "text-warning-text", dot: "bg-warning" },
  active:      { bg: "bg-brand-tint",   text: "text-brand-text",   dot: "bg-brand"   },
  inactive:    { bg: "bg-muted",        text: "text-muted-foreground", dot: "bg-muted-foreground" },
  default:     { bg: "bg-muted",        text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

export interface StatusPillProps {
  variant?: PillVariant;
  label: string;
  className?: string;
}

export function StatusPill({ variant = "default", label, className }: StatusPillProps) {
  const cls = PILL[variant] ?? PILL.default;
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent gap-1.5 font-medium whitespace-nowrap",
        cls.bg,
        cls.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cls.dot)} />
      {label}
    </Badge>
  );
}
