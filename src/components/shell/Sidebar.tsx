import { useState, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { useAppearance } from "@/stores/appearance";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MENU, MENU_CORE, MENU_SECTOR, MENU_ADMIN, type MenuItem } from "@/config/menu";

function isModuleActive(item: MenuItem, pathname: string) {
  return item.route === "/" ? pathname === "/" : pathname.startsWith(item.route);
}

/* ── Group header label ─────────────────────────────────────── */
function GroupHeader({ label }: { label: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
      {label}
    </p>
  );
}

/* ── Sub-item link (accordion) ──────────────────────────────── */
function SubLink({ route, label, onClose }: { route: string; label: string; onClose?: () => void }) {
  return (
    <NavLink
      to={route}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          "flex items-center h-8 rounded text-xs transition-colors ps-3 pe-2",
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

/* ── Full-mode accordion nav item ───────────────────────────── */
function AccordionItem({
  item, isActive, isOpen, onToggle, onClose,
}: {
  item: MenuItem;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
}) {
  const { t } = useTranslation("shell");
  const label = t(`nav.${item.key}`);

  if (item.status === "soon") {
    return (
      <div className="flex items-center gap-3 h-10 px-3 rounded text-sm text-muted-foreground/50 cursor-not-allowed select-none">
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{label}</span>
        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{t("soon")}</Badge>
      </div>
    );
  }

  if (!item.subItems?.length) {
    return (
      <NavLink
        to={item.route}
        end={item.route === "/"}
        onClick={onClose}
        className={({ isActive: a }) =>
          cn(
            "flex items-center gap-3 h-10 px-3 rounded text-sm transition-colors relative",
            a
              ? "bg-brand-tint text-brand-text font-medium before:absolute before:start-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-brand"
              : "text-muted-foreground hover:bg-background hover:text-foreground"
          )
        }
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 h-10 px-3 rounded text-sm transition-colors",
          isActive && !isOpen
            ? "bg-brand-tint text-brand-text font-medium"
            : "text-muted-foreground hover:bg-background hover:text-foreground"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-start">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="ms-4 mt-0.5 space-y-0.5 border-s border-border ps-2">
          {item.subItems.map(sub => (
            <SubLink
              key={sub.key}
              route={sub.route}
              label={t(`nav.${sub.key}`)}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Mini-rail item ─────────────────────────────────────────── */
/*
 * Uses plain <Link> (not NavLink) so className is always a plain string —
 * isActive is computed via useLocation to avoid the arrow-function className
 * anti-pattern that caused the tooltip-covering-icon bug.
 *
 * Items WITHOUT sub-items → Tooltip (pointer-events:none, pure label).
 * Items WITH sub-items    → Popover flyout with side="end" + sideOffset.
 * Both use side="end" which Radix resolves as logical-end via DirectionProvider.
 */
function MiniItem({ item, onClose }: { item: MenuItem; onClose?: () => void }) {
  const { t } = useTranslation("shell");
  const location = useLocation();
  const [flyOpen, setFlyOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const label = t(`nav.${item.key}`);
  const active = isModuleActive(item, location.pathname);

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setFlyOpen(false), 150);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const iconCls = cn(
    "flex items-center justify-center h-10 w-full rounded transition-colors",
    active
      ? "bg-brand-tint text-brand-text"
      : "text-muted-foreground hover:bg-background hover:text-foreground"
  );

  if (item.status === "soon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(iconCls, "opacity-40 cursor-not-allowed")}>
            <item.icon className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        {/* TODO(RTL-bug): logical "end" should map to "left" in RTL; Radix doesn't support logical sides yet */}
        <TooltipContent side={"end" as "right"} sideOffset={8}>
          {label} — {t("soon")}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (item.subItems?.length) {
    return (
      <Popover open={flyOpen} onOpenChange={setFlyOpen}>
        <PopoverTrigger asChild>
          {/* Plain Link with string className — no arrow-function wrapper */}
          <Link
            to={item.route}
            onClick={onClose}
            onMouseEnter={() => { cancelClose(); setFlyOpen(true); }}
            onMouseLeave={scheduleClose}
            className={iconCls}
          >
            <item.icon className="h-4 w-4" />
          </Link>
        </PopoverTrigger>
        {/* TODO(RTL-bug): logical "end" should map to "left" in RTL; Radix doesn't support logical sides yet */}
        <PopoverContent
          side={"end" as "right"}
          sideOffset={8}
          align="start"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => e.preventDefault()}
          className="w-[188px] p-1"
        >
          <p className="px-2 pt-1 pb-1.5 text-xs font-semibold text-foreground">{label}</p>
          {item.subItems.map(sub => (
            <NavLink
              key={sub.key}
              to={sub.route}
              onClick={() => { onClose?.(); setFlyOpen(false); }}
              className={({ isActive }) =>
                cn(
                  "flex items-center h-8 px-2 rounded text-xs transition-colors",
                  isActive
                    ? "bg-brand-tint text-brand-text font-medium"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                )
              }
            >
              {t(`nav.${sub.key}`)}
            </NavLink>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  /* Plain Tooltip — TooltipContent has pointer-events:none so it never
     intercepts clicks on the Link beneath it. */
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Plain Link with string className — fixes tooltip-covering-icon */}
        <Link
          to={item.route}
          onClick={onClose}
          className={iconCls}
        >
          <item.icon className="h-4 w-4" />
        </Link>
      </TooltipTrigger>
      {/* TODO(RTL-bug): logical "end" should map to "left" in RTL; Radix doesn't support logical sides yet */}
      <TooltipContent side={"end" as "right"} sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}

/* ── Public Sidebar component ───────────────────────────────── */
interface SidebarProps {
  onClose?: () => void;
  inDrawer?: boolean;
}

export function Sidebar({ onClose, inDrawer = false }: SidebarProps) {
  const { t } = useTranslation("shell");
  const { collapsed, branding } = useAppearance();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    const item = MENU.find(m => m.key === key);
    if (item && isModuleActive(item, location.pathname)) return;
    setOpenKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (collapsed && !inDrawer) {
    return (
      <TooltipProvider delayDuration={300}>
        <aside className="flex flex-col h-full bg-card border-e border-border [grid-area:nav]">
          <Link to="/" className="flex items-center justify-center h-[var(--topbar-h)] border-b border-border shrink-0">
            {branding.logoUrl
              ? <img src={branding.logoUrl} alt="logo" className="h-7 w-7 object-contain" />
              : <span className="text-lg font-bold text-brand">F</span>
            }
          </Link>

          <ScrollArea className="flex-1 py-2">
            <nav className="space-y-0.5 px-2">
              {MENU.map(item => (
                <MiniItem key={item.key} item={item} onClose={onClose} />
              ))}
            </nav>
          </ScrollArea>
        </aside>
      </TooltipProvider>
    );
  }

  const accordionNav = (
    <ScrollArea className="flex-1 py-2">
      <nav className="space-y-0.5 px-2">
        <GroupHeader label={t("nav_groups.core")} />
        {MENU_CORE.map(item => (
          <AccordionItem
            key={item.key}
            item={item}
            isActive={isModuleActive(item, location.pathname)}
            isOpen={openKeys.has(item.key) || isModuleActive(item, location.pathname)}
            onToggle={() => toggle(item.key)}
            onClose={onClose}
          />
        ))}

        <GroupHeader label={t("nav_groups.sector")} />
        {MENU_SECTOR.map(item => (
          <AccordionItem
            key={item.key}
            item={item}
            isActive={isModuleActive(item, location.pathname)}
            isOpen={openKeys.has(item.key) || isModuleActive(item, location.pathname)}
            onToggle={() => toggle(item.key)}
            onClose={onClose}
          />
        ))}

        <GroupHeader label={t("nav_groups.admin")} />
        {MENU_ADMIN.map(item => (
          <AccordionItem
            key={item.key}
            item={item}
            isActive={isModuleActive(item, location.pathname)}
            isOpen={openKeys.has(item.key) || isModuleActive(item, location.pathname)}
            onToggle={() => toggle(item.key)}
            onClose={onClose}
          />
        ))}
      </nav>
    </ScrollArea>
  );

  if (inDrawer) return accordionNav;

  return (
    <aside className="flex flex-col h-full bg-card border-e border-border [grid-area:nav]">
      <Link to="/" className="flex items-center h-[var(--topbar-h)] px-4 border-b border-border shrink-0 gap-3">
        {branding.logoUrl && (
          <img src={branding.logoUrl} alt="logo" className="h-7 w-7 object-contain shrink-0" />
        )}
        <span className="text-lg font-bold text-brand tracking-tight truncate">
          {branding.companyName || "Flexova"}
        </span>
      </Link>

      {accordionNav}
    </aside>
  );
}
