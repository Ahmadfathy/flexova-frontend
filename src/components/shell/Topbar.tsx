import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EtaBadge } from "./EtaBadge";
import { UserChip } from "./UserChip";
import { AppearancePopover } from "./AppearancePopover";
import { MobileDrawer } from "./MobileDrawer";
import { useAppearance } from "@/stores/appearance";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { t } = useTranslation("shell");
  const { nav } = useAppearance();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 flex items-center gap-3 px-4 border-b border-border bg-card/80 backdrop-blur-sm",
          "h-[var(--topbar-h)] [grid-area:top]"
        )}
      >
        {/* Mobile hamburger */}
        <Button
          variant="icon"
          size="icon"
          className="sm:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Brand — shown on mobile / horizontal nav */}
        {(nav === "horizontal") && (
          <span className="text-base font-bold text-brand tracking-tight">Flexova</span>
        )}

        {/* Search */}
        <div className="flex-1 max-w-sm hidden sm:flex items-center gap-2 rounded-sm border border-border bg-background px-3 h-9">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none"
            placeholder={t("topbar.search")}
          />
        </div>

        <div className="flex-1" />

        {/* Right actions */}
        <EtaBadge state="connected" />

        <Button variant="icon" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-danger" />
        </Button>

        <AppearancePopover />

        <UserChip />
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
