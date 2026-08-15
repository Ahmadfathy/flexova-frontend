import * as React from "react";
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type AlertVariant = "success" | "danger" | "warning" | "info" | "light" | "white";

const STYLES: Record<AlertVariant, { container: string; icon: string; title: string; body: string }> = {
  success: {
    container: "bg-success-tint border border-success/30",
    icon:      "text-success",
    title:     "text-success-text",
    body:      "text-success-text/80",
  },
  danger: {
    container: "bg-danger-tint border border-danger/30",
    icon:      "text-danger",
    title:     "text-danger-text",
    body:      "text-danger-text/80",
  },
  warning: {
    container: "bg-warning-tint border border-warning/30",
    icon:      "text-warning",
    title:     "text-warning-text",
    body:      "text-warning-text/80",
  },
  info: {
    container: "bg-info-tint border border-brand/30",
    icon:      "text-brand",
    title:     "text-brand-text",
    body:      "text-brand-text/80",
  },
  light: {
    container: "bg-muted border border-border",
    icon:      "text-muted-foreground",
    title:     "text-foreground",
    body:      "text-muted-foreground",
  },
  white: {
    container: "bg-card border border-border",
    icon:      "text-muted-foreground",
    title:     "text-foreground",
    body:      "text-muted-foreground",
  },
};

const DEFAULT_ICON: Record<AlertVariant, React.ElementType> = {
  success: CheckCircle2,
  danger:  XCircle,
  warning: AlertTriangle,
  info:    Info,
  light:   Info,
  white:   Info,
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: React.ReactNode;
  onClose?: () => void;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function Alert({
  variant = "info",
  title,
  onClose,
  icon,
  className,
  children,
}: AlertProps) {
  const { t } = useTranslation("common");
  const s = STYLES[variant];
  const IconComp = DEFAULT_ICON[variant];
  const renderedIcon = icon ?? <IconComp className="size-5 shrink-0" />;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded px-4 py-3",
        s.container,
        className,
      )}
    >
      {/* Icon — logical start */}
      <span className={cn("mt-0.5 shrink-0", s.icon)} aria-hidden>
        {renderedIcon}
      </span>

      {/* Text block */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("text-sm font-semibold leading-snug", s.title)}>
            {title}
          </p>
        )}
        {children && (
          <p className={cn("text-sm leading-snug", title ? "mt-0.5" : "", s.body)}>
            {children}
          </p>
        )}
      </div>

      {/* Close — logical end */}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("close")}
          onClick={onClose}
          className={cn("shrink-0 -me-1 -mt-0.5 h-8 w-8", s.icon)}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
