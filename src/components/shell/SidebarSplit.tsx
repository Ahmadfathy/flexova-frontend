import { useState, useEffect, useCallback } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppearance } from "@/stores/appearance";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MENU, type MenuItem } from "@/config/menu";

const SESSION_KEY = "flexova.subpanel";

function isModuleActive(item: MenuItem, pathname: string) {
  return item.route === "/" ? pathname === "/" : pathname.startsWith(item.route);
}

/* ── Sub-item link ───────────────────────────────────────────── */
function PanelSubItem({ route, label, onClose }: { route: string; label: string; onClose?: () => void }) {
  return (
    <NavLink
      to={route}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          "flex items-center h-8 px-3 rounded-sm text-xs transition-colors",
          isActive
            ? "bg-brand-tint text-brand-text font-medium"
            : "text-muted-foreground hover:bg-background hover:text-foreground"
        )
      }
    >
      <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0 me-2" />
      {label}
    </NavLink>
  );
}

/* ── Rail item ───────────────────────────────────────────────── */
const RAIL_BASE   = "size-10 rounded flex items-center justify-center text-muted-foreground hover:bg-background transition-colors motion-reduce:transition-none";
const RAIL_ACTIVE = "bg-[var(--brand-tint)] text-[var(--brand-text)]";

interface RailItemProps {
  item: MenuItem;
  onClick: () => void;
}

function RailItem({ item, onClick }: RailItemProps) {
  const { t } = useTranslation("shell");
  const { pathname } = useLocation();
  const label = t(`nav.${item.key}`);
  const tooltipLabel = item.status === "soon" ? `${label} — ${t("soon")}` : label;
  const isActive = isModuleActive(item, pathname);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {item.status === "soon" ? (
          <div className={cn(RAIL_BASE, "opacity-40 cursor-not-allowed")}>
            <item.icon className="size-5" />
          </div>
        ) : (
          <Link
            to={item.route}
            onClick={onClick}
            className={cn(RAIL_BASE, isActive && RAIL_ACTIVE)}
          >
            <item.icon className="size-5" />
          </Link>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}

/* ── SidebarSplit ────────────────────────────────────────────── */
interface SidebarSplitProps {
  onClose?: () => void;
}

export function SidebarSplit({ onClose }: SidebarSplitProps) {
  const { t } = useTranslation("shell");
  const { collapsed, branding } = useAppearance();
  const location = useLocation();

  const activeModule = MENU.find(m => isModuleActive(m, location.pathname));

  const [subPanelOpen, setSubPanelOpen] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true"
  );

  useEffect(() => {
    document.documentElement.dataset.subpanelOpen = subPanelOpen ? "true" : "";
    return () => {
      delete document.documentElement.dataset.subpanelOpen;
    };
  }, [subPanelOpen]);

  useEffect(() => {
    if (location.pathname === "/") {
      document.documentElement.dataset.subpanelOpen = "";
      sessionStorage.setItem(SESSION_KEY, "false");
      setSubPanelOpen(false);
    }
  }, [location.pathname]);

  const openSubPanel = useCallback(() => {
    document.documentElement.dataset.subpanelOpen = "true";
    sessionStorage.setItem(SESSION_KEY, "true");
    setSubPanelOpen(true);
    onClose?.();
  }, [onClose]);

  const showPanel = !collapsed && subPanelOpen;

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="flex flex-row h-full [grid-area:nav]">

        {/* ── Icon rail — always 72px ────────────────────────── */}
        <div className="flex flex-col w-[72px] shrink-0 bg-card border-e border-border">
          <Link
            to="/"
            className="flex items-center justify-center h-[var(--topbar-h)] border-b border-border shrink-0"
          >
            {branding.logoUrl
              ? <img src={branding.logoUrl} alt="logo" className="h-7 w-7 object-contain" />
              : <span className="text-lg font-bold text-brand">F</span>
            }
          </Link>

          {/* Scrollable so the rail never clips items on short viewports */}
          <ScrollArea className="flex-1 py-2">
            <nav className="flex flex-col items-center gap-1 py-1 px-2">
              {MENU.map(item => (
                <RailItem
                  key={item.key}
                  item={item}
                  onClick={openSubPanel}
                />
              ))}
            </nav>
          </ScrollArea>
        </div>

        {/* ── Sub-item panel — always in DOM, animates width ─── */}
        <div
          className={cn(
            "overflow-hidden border-e border-border",
            "transition-[width] duration-300 ease-brand",
            showPanel ? "w-[220px]" : "w-0"
          )}
        >
          <div className="w-[220px] flex flex-col h-full bg-card/60">
            <div className="h-[var(--topbar-h)] border-b border-border shrink-0 flex items-center px-4">
              <span className="text-sm font-semibold text-brand truncate">
                {branding.companyName || "Flexova"}
              </span>
            </div>

            <ScrollArea className="flex-1">
              <nav className="px-2 py-3">
                {activeModule && (
                  <p className="px-3 mb-4 text-[15px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                    {t(`nav.${activeModule.key}`)}
                  </p>
                )}
                <div className="space-y-0.5">
                  {activeModule?.subItems?.length ? (
                    activeModule.subItems.map(sub => (
                      <PanelSubItem
                        key={sub.key}
                        route={sub.route}
                        label={t(`nav.${sub.key}`)}
                        onClose={onClose}
                      />
                    ))
                  ) : (
                    <p className="px-3 py-4 text-xs text-muted-foreground/60 text-center">
                      —
                    </p>
                  )}
                </div>
              </nav>
            </ScrollArea>
          </div>
        </div>

      </aside>
    </TooltipProvider>
  );
}
