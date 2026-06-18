import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppearance } from "@/stores/appearance";
import { Button } from "@/components/ui/button";
import { Sheet, SheetPortal, SheetOverlay, SheetClose, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

/*
 * Uses shadcn Sheet for the scrim (SheetOverlay) and body-scroll lock (Radix
 * Dialog root). The panel itself keeps our custom positioning classes with
 * logical start-0 so it opens from the correct side in both LTR and RTL.
 * SheetContent is intentionally NOT used to avoid its built-in physical-side
 * variants and its own close button — we render the close button ourselves.
 */
export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { t } = useTranslation("shell");
  const { branding } = useAppearance();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetPortal>
        {/* Shadcn-standard scrim (bg-black/80 + fade animation) */}
        <SheetOverlay />

        {/* Drawer panel — logical start-0 so RTL works without a physical-side variant */}
        <DialogPrimitive.Content
          className={[
            "drawer-panel",
            "fixed inset-y-0 start-0 z-[60]",
            "w-[min(85vw,320px)] flex flex-col",
            "bg-card shadow-[var(--shadow)]",
            "focus:outline-none",
          ].join(" ")}
          aria-describedby={undefined}
        >
          <SheetTitle className="sr-only">{t("topbar.open_menu")}</SheetTitle>

          {/* Header: logo + close */}
          <div className="flex items-center justify-between h-[var(--topbar-h)] px-4 border-b border-border shrink-0">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-2.5 min-w-0"
            >
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="" className="h-7 w-7 object-contain shrink-0" />
              ) : null}
              <span className="text-base font-bold text-brand truncate">
                {branding.companyName || "Flexova"}
              </span>
            </Link>

            <SheetClose asChild>
              <Button
                variant="icon"
                size="icon"
                aria-label={t("topbar.close_menu")}
                className="shrink-0 ms-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>

          <Sidebar onClose={onClose} inDrawer />
        </DialogPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}
