import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

/* ─────────────────────────────────────────────────────────────
   FormSection — titled block that groups related fields
   ───────────────────────────────────────────────────────────── */
export interface FormSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, subtitle, children, className }: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || subtitle) && (
        <div className="space-y-0.5">
          {title && (
            <p className="text-sm font-semibold text-foreground">{title}</p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          <Separator className="mt-2" />
        </div>
      )}
      <div className="grid gap-4">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FormField — label above + control + helper/error below
   ───────────────────────────────────────────────────────────── */
export interface FormFieldProps {
  /** Text shown above the control */
  label: string;
  /** Connects label to the control via htmlFor */
  htmlFor?: string;
  /** Whether to show the required asterisk */
  required?: boolean;
  /** Muted hint text shown below the control */
  helper?: string;
  /** Error text shown below (replaces helper, danger color) */
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  helper,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className={cn("text-sm font-medium", error && "text-danger-text")}
      >
        {label}
        {required && (
          <span className="ms-0.5 text-danger" aria-hidden>*</span>
        )}
      </Label>

      {children}

      {(error || helper) && (
        <p
          className={cn(
            "text-xs leading-snug",
            error ? "text-danger-text" : "text-muted-foreground"
          )}
        >
          {error ?? helper}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FormGrid — responsive 1/2-column grid for field rows
   ───────────────────────────────────────────────────────────── */
export interface FormGridProps {
  cols?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}

export function FormGrid({ cols = 2, children, className }: FormGridProps) {
  const colClass = { 1: "grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[cols];
  return (
    <div className={cn("grid grid-cols-1 gap-4", colClass, className)}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FormActions — Cancel (ghost) + Save (primary) on logical end
   ───────────────────────────────────────────────────────────── */
export interface FormActionsProps {
  onCancel?: () => void;
  onSave?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  /** Show loading spinner on Save */
  saving?: boolean;
  disabled?: boolean;
  /** Extra content placed at the logical start of the row */
  start?: React.ReactNode;
  className?: string;
}

export function FormActions({
  onCancel,
  onSave,
  saveLabel,
  cancelLabel,
  saving = false,
  disabled = false,
  start,
  className,
}: FormActionsProps) {
  const { t } = useTranslation("common");

  return (
    <div
      className={cn(
        "flex items-center gap-3 pt-2",
        start ? "justify-between" : "justify-end",
        className
      )}
    >
      {start && <div className="flex items-center gap-2">{start}</div>}

      <div className="flex items-center gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
          >
            {cancelLabel ?? t("cancel")}
          </Button>
        )}
        <Button
          type={onSave ? "button" : "submit"}
          onClick={onSave}
          disabled={disabled || saving}
          className="min-w-24"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
                aria-hidden
              />
              {saveLabel ?? t("save")}
            </span>
          ) : (
            saveLabel ?? t("save")
          )}
        </Button>
      </div>
    </div>
  );
}
