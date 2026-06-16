import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, PanelLeft, Home, Search, Maximize, Minimize, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EtaBadge } from "./EtaBadge";
import { UserMenu } from "./UserChip";
import { MobileDrawer } from "./MobileDrawer";
import { HorizontalModuleBar, HorizontalSubBar } from "./HorizontalNav";
import { useAppearance } from "@/stores/appearance";
import { cn } from "@/lib/utils";

function FullscreenButton() {
  const { t } = useTranslation("shell");
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const update = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return (
    <Button
      variant="icon"
      size="icon"
      onClick={toggle}
      aria-label={fs ? t("topbar.fullscreen_exit") : t("topbar.fullscreen_enter")}
    >
      {fs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
    </Button>
  );
}

export function Topbar() {
  const { t } = useTranslation("shell");
  const { layout, collapsed, toggleCollapsed, branding } = useAppearance();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isHorizontal = layout === "horizontal";

  const row1 = (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="icon"
        size="icon"
        className="sm:hidden"
        onClick={() => setDrawerOpen(true)}
        aria-label={t("topbar.open_menu")}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Brand link — horizontal layout, desktop */}
      {isHorizontal && (
        <Link
          to="/"
          className="hidden sm:inline-flex text-base font-bold text-brand tracking-tight shrink-0"
        >
          {branding.companyName || "Flexova"}
        </Link>
      )}

      {/* Collapse — sidebar layouts, desktop */}
      {!isHorizontal && (
        <Button
          variant="icon"
          size="icon"
          className="hidden sm:inline-flex"
          onClick={toggleCollapsed}
          aria-label={collapsed ? t("topbar.expand") : t("topbar.collapse")}
        >
          <PanelLeft
            className={cn(
              "h-4 w-4 transition-transform duration-300 rtl:-scale-x-100",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      )}

      {/* Home — all layouts, desktop */}
      <Button variant="icon" size="icon" asChild className="hidden sm:inline-flex">
        <Link to="/" aria-label={t("topbar.home")}>
          <Home className="h-4 w-4" />
        </Link>
      </Button>

      {/* Search — all layouts, desktop */}
      <div className="hidden sm:flex flex-1 max-w-sm items-center gap-2 rounded-sm border border-border bg-background px-3 h-9">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none"
          placeholder={t("topbar.search")}
        />
      </div>

      <div className="flex-1" />

      <EtaBadge state="connected" />
      <FullscreenButton />

      <Button variant="icon" size="icon" aria-label={t("topbar.notifications")} className="relative">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-danger" />
      </Button>

      <UserMenu />
    </>
  );

  return (
    <>
      <header
        className={cn(
          /* min-w-0: prevents the grid item from expanding the column beyond
             the viewport when inner content is wider than available space.    */
          "sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm [grid-area:top] min-w-0 w-full",
          !isHorizontal && "flex items-center gap-2 px-4 h-[var(--topbar-h)]"
        )}
      >
        {isHorizontal ? (
          <>
            {/* Row 1 — min-w-0 keeps the flex row from pushing the header wider */}
            <div className="flex items-center gap-2 px-4 h-[var(--topbar-h)] min-w-0">{row1}</div>
            {/* Row 2: module tabs — desktop only */}
            <div className="border-t border-border hidden sm:block min-w-0">
              <HorizontalModuleBar />
            </div>
            {/* Row 3: active module's sub-items — desktop only, hidden when no sub-items */}
            <div className="hidden sm:block min-w-0">
              <HorizontalSubBar />
            </div>
          </>
        ) : (
          row1
        )}
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
