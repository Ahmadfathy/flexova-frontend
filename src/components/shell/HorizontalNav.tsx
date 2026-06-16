import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { MENU, type MenuItem } from "@/config/menu";

function isModuleActive(item: MenuItem, pathname: string) {
  return pathname.startsWith(item.route);
}

/* ── Row 2: module tabs ─────────────────────────────────────── */
export function HorizontalModuleBar() {
  const { t } = useTranslation("shell");
  const { pathname } = useLocation();

  return (
    <nav className="flex items-center overflow-x-auto overflow-y-hidden px-4 h-11 nav-scroll w-full min-w-0" aria-label={t("nav_groups.core")}>
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
      className="flex items-center overflow-x-auto overflow-y-hidden px-4 h-10 border-t border-border nav-scroll w-full min-w-0"
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
