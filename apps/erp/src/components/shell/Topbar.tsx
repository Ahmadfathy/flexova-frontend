import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, PanelLeft, Home, Maximize, Minimize, Bell, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EtaBadge } from "./EtaBadge";
import { UserMenu } from "./UserChip";
import { MobileDrawer } from "./MobileDrawer";
import { HorizontalModuleBar, HorizontalSubBar, HorizontalDropdownModuleBar } from "./HorizontalNav";
import { SearchPanel } from "./SearchPanel";
import { QuickAdd } from "./QuickAdd";
import { ActiveTimer } from "./ActiveTimer";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/** Reciprocal quick-launch (FE_09a §1) — opens /pos in a new tab, gated by pos.access. */
function OpenPosButton() {
  const { t } = useTranslation("shell");
  const can = useCan();

  if (!can("pos.access")) return null;

  return (
    <Button variant="icon" size="icon" asChild className="hidden sm:inline-flex shrink-0">
      <a href="/pos" target="_blank" rel="noopener noreferrer" aria-label={t("topbar.open_pos")} title={t("topbar.open_pos")}>
        <ExternalLink className="h-4 w-4" />
      </a>
    </Button>
  );
}

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
  const isHorizontalDropdown = layout === "horizontal-dropdown";
  const isHorizontal = layout === "horizontal" || isHorizontalDropdown;

  const row1 = (
    <>
      {/* ── Start side ──────────────────────────────────────── */}

      {/* Hamburger — mobile only; opens the slide-in drawer */}
      <Button
        variant="icon"
        size="icon"
        className="sm:hidden shrink-0"
        onClick={() => setDrawerOpen(true)}
        aria-label={t("topbar.open_menu")}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Collapse toggle — sidebar layouts, desktop only */}
      {!isHorizontal && (
        <Button
          variant="icon"
          size="icon"
          className="hidden sm:inline-flex shrink-0"
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

      {/* Brand wordmark — horizontal layout, desktop only.
          On mobile the brand lives in the drawer header instead. */}
      {isHorizontal && (
        <Link
          to="/"
          className="hidden sm:inline-flex text-base font-bold text-brand tracking-tight shrink-0"
        >
          {branding.companyName || "Flexova"}
        </Link>
      )}

      {/* Home — all layouts, all sizes */}
      <Button variant="icon" size="icon" asChild className="shrink-0">
        <Link to="/" aria-label={t("topbar.home")}>
          <Home className="h-4 w-4" />
        </Link>
      </Button>

      {/* Search — all layouts, all sizes.
          PopoverContent uses w-[min(560px,calc(100vw-2rem))], so it's
          essentially full-width on narrow screens. */}
      <div className="shrink-0">
        <SearchPanel />
      </div>

      {/* Quick Add — outlined button, right next to Search */}
      <QuickAdd />

      {/* ── Spacer ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0" />

      {/* ── End side ────────────────────────────────────────── */}

      {/* Active timer — additive slot (FE_16 §11); hidden entirely if module/permission off */}
      <ActiveTimer />

      {/* ETA badge — always visible, sits in its own slot */}
      <EtaBadge />

      {/* Open POS — quick-launch, new tab, gated by pos.access */}
      <OpenPosButton />

      {/* Fullscreen — desktop only; too cramped on 375 px.
          sm:contents dissolves the wrapper so the Button is a
          direct flex child on desktop. */}
      <div className="hidden sm:contents">
        <FullscreenButton />
      </div>

      {/* Notifications */}
      <Button
        variant="icon"
        size="icon"
        aria-label={t("topbar.notifications")}
        className="relative shrink-0"
      >
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
          "sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm [grid-area:top] min-w-0 w-full",
          !isHorizontal && "relative flex items-center gap-2 px-4 h-[var(--topbar-h)]"
        )}
      >
        {isHorizontal ? (
          <>
            <div className="relative flex items-center gap-2 px-4 h-[var(--topbar-h)] min-w-0">
              {row1}
            </div>
            {/* Row 2 — module bar; component differs by layout variant */}
            <div className="border-t border-border hidden sm:block min-w-0">
              {isHorizontalDropdown
                ? <HorizontalDropdownModuleBar />
                : <HorizontalModuleBar />
              }
            </div>
            {/* Row 3 — sub-item tabs; only for the plain horizontal layout */}
            {!isHorizontalDropdown && (
              <div className="hidden sm:block min-w-0">
                <HorizontalSubBar />
              </div>
            )}
          </>
        ) : (
          row1
        )}
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
