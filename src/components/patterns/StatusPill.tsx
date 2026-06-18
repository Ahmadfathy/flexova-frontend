import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type PillVariant = "paid" | "credit" | "sent" | "rejected" | "default";

const pillClasses: Record<PillVariant, { bg: string; text: string; dot: string }> = {
  paid:     { bg: "bg-success-tint", text: "text-success-text", dot: "bg-success" },
  credit:   { bg: "bg-warning-tint", text: "text-warning-text", dot: "bg-warning" },
  sent:     { bg: "bg-brand-tint",   text: "text-brand-text",   dot: "bg-brand" },
  rejected: { bg: "bg-danger-tint",  text: "text-danger-text",  dot: "bg-danger" },
  default:  { bg: "bg-muted",        text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

interface StatusPillProps {
  variant?: PillVariant;
  label: string;
  className?: string;
}

export function StatusPill({ variant = "default", label, className }: StatusPillProps) {
  const cls = pillClasses[variant];
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent gap-1.5 font-medium",
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
