import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MENU, type MenuItem } from "@/config/menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

function isModuleActive(item: MenuItem, pathname: string) {
  return item.route === "/" ? pathname === "/" : pathname.startsWith(item.route);
}

/* ── Row 2: module tabs ─────────────────────────────────────── */
export function HorizontalModuleBar() {
  const { t } = useTranslation("shell");
  const { pathname } = useLocation();

  return (
    <nav className="flex items-center justify-center overflow-x-auto overflow-y-hidden px-4 h-11 nav-scroll w-full min-w-0" aria-label={t("nav_groups.core")}>
      {MENU.map(item => {
        const active = isModuleActive(item, pathname);

        if (item.status === "soon") {
          return (
            <div
              key={item.key}
              className="flex items-center gap-1.5 h-11 px-3 text-sm border-b-2 border-transparent text-muted-foreground/40 whitespace-nowrap shrink-0 select-none"
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {t(`nav.${item.key}`)}
            </div>
          );
        }

        return (
          <NavLink
            key={item.key}
            to={item.route}
            className={cn(
              "flex items-center gap-1.5 h-11 px-3 text-sm border-b-2 whitespace-nowrap shrink-0 transition-colors",
              active
                ? "border-brand text-brand font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            {t(`nav.${item.key}`)}
          </NavLink>
        );
      })}
    </nav>
  );
}

/* ── Row 3: sub-item tabs of the active module ──────────────── */
export function HorizontalSubBar() {
  const { t } = useTranslation("shell");
  const { pathname } = useLocation();
  const activeModule = MENU.find(m => isModuleActive(m, pathname));

  if (!activeModule?.subItems?.length) return null;

  return (
    <nav
      className="flex items-center justify-center overflow-x-auto overflow-y-hidden px-4 h-10 border-t border-border nav-scroll w-full min-w-0"
      aria-label={t(`nav.${activeModule.key}`)}
    >
      {activeModule.subItems.map(sub => (
        <NavLink
          key={sub.key}
          to={sub.route}
          className={({ isActive }) =>
            cn(
              "flex items-center h-10 px-3 text-sm border-b-2 whitespace-nowrap shrink-0 transition-colors",
              isActive
                ? "border-brand text-brand font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )
          }
        >
          {t(`nav.${sub.key}`)}
        </NavLink>
      ))}
    </nav>
  );
}

/* ── Row 2 for "horizontal-dropdown" layout ─────────────────── */

/**
 * One module tab. Modules with sub-items open a Popover dropdown on click
 * (no navigation — sub-items handle that). Modules without sub-items navigate
 * directly. Active state is derived from the current pathname, not from Popover
 * open state, so the highlighted tab survives the dropdown being closed.
 */
function DropdownModuleItem({ item }: { item: MenuItem }) {
  const { t } = useTranslation("shell");
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const active = isModuleActive(item, pathname);

  const tabCls = cn(
    "flex items-center gap-1.5 h-11 px-3 text-sm border-b-2 whitespace-nowrap shrink-0 transition-colors",
    active
      ? "border-brand text-brand font-medium"
      : "border-transparent text-muted-foreground hover:text-foreground",
  );

  /* "soon" — non-interactive */
  if (item.status === "soon") {
    return (
      <div className={cn(tabCls, "opacity-40 cursor-not-allowed border-transparent")}>
        <item.icon className="h-3.5 w-3.5 shrink-0" />
        {t(`nav.${item.key}`)}
      </div>
    );
  }

  /* No sub-items — just navigate */
  if (!item.subItems?.length) {
    return (
      <NavLink
        to={item.route}
        end={item.route === "/"}
        className={() => tabCls}
      >
        <item.icon className="h-3.5 w-3.5 shrink-0" />
        {t(`nav.${item.key}`)}
      </NavLink>
    );
  }

  /* Sub-items — click opens dropdown; navigation is done via sub-item links */
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          className={cn(
            tabCls,
            /* keep brand highlight when dropdown is open so the visual connection
               between the active tab and its open dropdown is clear */
            open && "border-brand text-brand",
          )}
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          {t(`nav.${item.key}`)}
          <ChevronDown
            className={cn(
              "h-3 w-3 ms-1 transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      {/*
        Popover renders via Portal so it escapes the nav's overflow:hidden.
        align="start" = logical-start edge of dropdown aligns with trigger start,
        RTL-correct via DirectionProvider.
        sideOffset=4 keeps the dropdown from sitting flush against the row border.
      */}
      <PopoverContent
        role="menu"
        side="bottom"
        align="start"
        sideOffset={4}
        className="w-52 p-0 overflow-hidden"
      >
        <ScrollArea className="max-h-[320px]">
          <div className="py-1" role="group">
            {item.subItems.map(sub => (
              <NavLink
                key={sub.key}
                to={sub.route}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center h-9 px-3 text-sm transition-colors",
                    isActive
                      ? "bg-brand-tint text-brand-text font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                {t(`nav.${sub.key}`)}
              </NavLink>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

/** Row 2 for the "horizontal-dropdown" layout. No Row 3. */
export function HorizontalDropdownModuleBar() {
  const { t } = useTranslation("shell");
  return (
    <nav
      className="flex items-center justify-center overflow-x-auto overflow-y-hidden px-4 h-11 nav-scroll w-full min-w-0"
      aria-label={t("nav_groups.core")}
    >
      {MENU.map(item => (
        <DropdownModuleItem key={item.key} item={item} />
      ))}
    </nav>
  );
}
