import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MENU, isModuleActive, type MenuItem } from "@/config/menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ── Row 2: module tabs ─────────────────────────────────────── */
export function HorizontalModuleBar() {
  const { t } = useTranslation("shell");

  return (
    <nav className="flex items-center justify-center overflow-x-auto overflow-y-hidden px-4 h-11 nav-scroll w-full min-w-0" aria-label={t("nav_groups.core")}>
      {MENU.map(item => {
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
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 h-11 px-3 text-sm border-b-2 whitespace-nowrap shrink-0 transition-colors",
                isActive
                  ? "border-brand text-brand font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
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

/*
 * Uses plain <Link> (not NavLink) for the no-subItem case so className is a
 * plain string — isActive is computed via useLocation. NavLink with a function
 * className caused the "stringified className" bug in this layout.
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

  if (item.status === "soon") {
    return (
      <div className={cn(tabCls, "opacity-40 cursor-not-allowed border-transparent")}>
        <item.icon className="h-3.5 w-3.5 shrink-0" />
        {t(`nav.${item.key}`)}
      </div>
    );
  }

  /* No sub-items — plain Link + string className (was NavLink with fn className) */
  if (!item.subItems?.length) {
    return (
      <Link to={item.route} className={tabCls}>
        <item.icon className="h-3.5 w-3.5 shrink-0" />
        {t(`nav.${item.key}`)}
      </Link>
    );
  }

  /* Sub-items — shadcn DropdownMenu; click opens; nav via sub-item links */
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={cn(tabCls, open && "border-brand text-brand")}
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
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="start" sideOffset={4} className="w-52">
        {item.subItems.map(sub => (
          <DropdownMenuItem key={sub.key} asChild>
            <NavLink
              to={sub.route}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center h-9 px-3 text-sm w-full",
                  isActive && "bg-brand-tint text-brand-text font-medium",
                )
              }
            >
              {t(`nav.${sub.key}`)}
            </NavLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
