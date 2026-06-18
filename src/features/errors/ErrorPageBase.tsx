import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageBaseProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}

export function ErrorPageBase({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: ErrorPageBaseProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm space-y-6">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
            <Icon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{subtitle}</p>
        </div>

        <Button onClick={onAction} className="px-8">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
