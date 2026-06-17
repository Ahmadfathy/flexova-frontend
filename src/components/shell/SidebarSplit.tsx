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

/* ── SidebarSplit ────────────────────────────────────────────── */
interface SidebarSplitProps {
  onClose?: () => void;
}

export function SidebarSplit({ onClose }: SidebarSplitProps) {
  const { t } = useTranslation("shell");
  const { collapsed, branding } = useAppearance();
  const location = useLocation();

  const activeModule = MENU.find(m => isModuleActive(m, location.pathname));

  // Sub-panel is closed by default; opens on first module click and stays open
  // for the rest of the browser session (sessionStorage).
  const [subPanelOpen, setSubPanelOpen] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true"
  );

  // Keep the html data-attribute in sync so the CSS grid rule can react.
  // Cleanup removes the attribute when the layout switches away from sidebar-split.
  useEffect(() => {
    document.documentElement.dataset.subpanelOpen = subPanelOpen ? "true" : "";
    return () => {
      delete document.documentElement.dataset.subpanelOpen;
    };
  }, [subPanelOpen]);

  // Close the panel whenever the user lands on home — regardless of how they got there.
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

          <ScrollArea className="flex-1 py-2">
            <nav className="flex flex-col items-center gap-1 py-1">
              {MENU.map(item => {
                const active = isModuleActive(item, location.pathname);

                const box = cn(
                  "relative flex items-center justify-center h-10 w-10 rounded-md transition-colors",
                  active
                    ? "bg-brand-tint text-brand"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                  item.status === "soon" && "opacity-40 cursor-not-allowed"
                );

                const tooltipLabel = item.status === "soon"
                  ? `${t(`nav.${item.key}`)} — ${t("soon")}`
                  : t(`nav.${item.key}`);

                const iconEl = (
                  <>
                    {active && (
                      <span
                        className="absolute start-0 top-2 bottom-2 w-0.5 rounded-e-full bg-brand"
                        aria-hidden="true"
                      />
                    )}
                    <item.icon className="h-4 w-4" />
                  </>
                );

                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      {item.status === "soon" ? (
                        <div className={box}>{iconEl}</div>
                      ) : (
                        <NavLink
                          to={item.route}
                          end={item.route === "/"}
                          onClick={openSubPanel}
                          className={() => box}
                        >
                          {iconEl}
                        </NavLink>
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {tooltipLabel}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </ScrollArea>
        </div>

        {/* ── Sub-item panel — always in DOM, animates width ─── */}
        {/*
          Always rendered so the width transition plays smoothly alongside
          the CSS grid transition. overflow-hidden clips content at w-0.
          The inner fixed-width div prevents content from compressing
          while the outer wrapper is mid-transition.
        */}
        <div
          className={cn(
            "overflow-hidden border-e border-border",
            "transition-[width] duration-300 ease-brand",
            showPanel ? "w-[220px]" : "w-0"
          )}
        >
          <div className="w-[220px] flex flex-col h-full bg-card/60">
            <div className="h-[var(--topbar-h)] border-b border-border shrink-0 flex items-center px-4">
              <span className="text-sm font-semibold text-foreground truncate">
                {activeModule ? t(`nav.${activeModule.key}`) : (branding.companyName || "Flexova")}
              </span>
            </div>

            <ScrollArea className="flex-1 py-2">
              <nav className="space-y-0.5 px-2">
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
                    {branding.companyName || "Flexova"}
                  </p>
                )}
              </nav>
            </ScrollArea>
          </div>
        </div>

      </aside>
    </TooltipProvider>
  );
}
