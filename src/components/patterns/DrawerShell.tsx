import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SheetOverlay, SheetPortal } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/*
 * DrawerShell — standard side-drawer wrapper (header / scrollable-body / footer).
 * Built on Radix Dialog (same primitive Sheet uses) with full-height drawer layout.
 *
 * Defaults to side="right" — consistent with all existing drawers in the app.
 * Both LTR and RTL open from the physical right edge (natural for detail panels).
 *
 * Usage:
 *   <DrawerShell open={open} onOpenChange={setOpen} title={t("sheet.title")}
 *     footer={
 *       <>
 *         <Button variant="ghost" onClick={() => setOpen(false)}>{t("common:cancel")}</Button>
 *         <Button onClick={handleSave}>{t("common:save")}</Button>
 *       </>
 *     }
 *   >
 *     ...body content...
 *   </DrawerShell>
 *
 * size: "sm" → max-w-sm | "md" → max-w-md (default) | "lg" → max-w-xl
 * side: "right" (default) | "left" | "top" | "bottom"
 */

type DrawerSide = "right" | "left" | "top" | "bottom";

const SIDE_CLASS: Record<DrawerSide, string> = {
  right:
    "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
  left:
    "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
  top:
    "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
  bottom:
    "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
};

const SIZE_CLASS: Record<string, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
};

interface DrawerShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  side?: DrawerSide;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export function DrawerShell({
  open,
  onOpenChange,
  title,
  description,
  footer,
  side = "right",
  size = "md",
  children,
  className,
}: DrawerShellProps) {
  const { t } = useTranslation("common");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col bg-card shadow-lg",
            "transition ease-in-out",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:duration-300 data-[state=open]:duration-500",
            SIDE_CLASS[side],
            SIZE_CLASS[size],
            className,
          )}
        >
          {/* Header — pinned, never scrolls */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border shrink-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold leading-none tracking-tight">
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

          {/* Body — fills height between header and footer, scrolls independently */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
            {children}
          </div>

          {/* Footer — pinned at bottom, only rendered when footer prop is provided */}
          {footer && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </SheetPortal>
    </DialogPrimitive.Root>
  );
}
