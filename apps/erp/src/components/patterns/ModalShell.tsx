import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/*
 * ModalShell — standard modal wrapper (header / scrollable-body / footer).
 *
 * Usage:
 *   <ModalShell open={open} onOpenChange={setOpen} title={t("form.title")}
 *     footer={
 *       <>
 *         <Button variant="ghost" onClick={() => setOpen(false)}>{t("common:cancel")}</Button>
 *         <Button onClick={handleSave}>{t("common:save")}</Button>
 *       </>
 *     }
 *   >
 *     ...form fields...
 *   </ModalShell>
 *
 * size: "sm" → max-w-sm | "md" → max-w-lg (default) | "lg" → max-w-2xl
 */

const SIZE_CLASS: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

interface ModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size = "md",
  children,
  className,
}: ModalShellProps) {
  const { t } = useTranslation("common");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%]",
            "max-h-[85vh] border bg-card shadow-lg duration-200 rounded",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            SIZE_CLASS[size],
            className,
          )}
        >
          {/* Header — pinned, never scrolls */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border shrink-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t("close")} className="shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Body — the only scrolling region */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
            {children}
          </div>

          {/* Footer — pinned, only rendered when footer prop is provided */}
          {footer && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
