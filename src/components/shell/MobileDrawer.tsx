import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppearance } from "@/stores/appearance";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { t } = useTranslation("shell");
  const { branding } = useAppearance();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>

        {/* ── Scrim ──────────────────────────────────────────────
            z-50 — above the topbar (z-40) and all page content.
            Click on it closes the drawer (DialogPrimitive handles this).
            Fade animation handled by tailwindcss-animate; prefers-reduced-motion
            rule in globals.css strips it automatically.                         */}
        <DialogPrimitive.Overlay
          className={[
            "fixed inset-0 z-50 bg-black/50",
            "data-[state=open]:animate-in  data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "duration-200",
          ].join(" ")}
        />

        {/* ── Drawer panel ────────────────────────────────────────
            z-[60] — above the scrim.
            start-0 = left in LTR, right in RTL (logical-start).
            .drawer-panel class drives RTL-aware keyframe slide animation
            defined in globals.css.
            Width: min(85vw, 320px) — comfortable on 375px screens.
            Body scroll is locked automatically by Radix Dialog.               */}
        <DialogPrimitive.Content
          className={[
            "drawer-panel",
            "fixed inset-y-0 start-0 z-[60]",
            "w-[min(85vw,320px)] flex flex-col",
            "bg-card shadow-[var(--shadow)]",
            "focus:outline-none",
          ].join(" ")}
          // Suppress Radix's missing-description warning — nav drawers don't need one
          aria-describedby={undefined}
        >
          {/* Visually-hidden title for screen readers */}
          <DialogPrimitive.Title className="sr-only">
            {t("topbar.open_menu")}
          </DialogPrimitive.Title>

          {/* ── Header: logo + close button ───────────────────── */}
          <div className="flex items-center justify-between h-[var(--topbar-h)] px-4 border-b border-border shrink-0">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-2.5 min-w-0"
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt=""
                  className="h-7 w-7 object-contain shrink-0"
                />
              ) : null}
              <span className="text-base font-bold text-brand truncate">
                {branding.companyName || "Flexova"}
              </span>
            </Link>

            <DialogPrimitive.Close asChild>
              <Button
                variant="icon"
                size="icon"
                aria-label={t("topbar.close_menu")}
                className="shrink-0 ms-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* ── Nav: Sidebar in drawer mode ───────────────────────
              inDrawer skips Sidebar's own <aside> wrapper and logo
              header, and forces full accordion regardless of collapsed.
              flex-1 fills remaining drawer height; scroll is inside
              Sidebar's ScrollArea so the drawer itself never scrolls. */}
          <Sidebar onClose={onClose} inDrawer />
        </DialogPrimitive.Content>

      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
