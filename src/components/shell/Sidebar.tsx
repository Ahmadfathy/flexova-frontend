import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppearance } from "@/stores/appearance";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, Calculator,
  UserCog, BarChart3, Shield, Settings, ChevronLeft,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { key: "dashboard",   icon: LayoutDashboard, href: "/" },
  { key: "inventory",   icon: Package,         href: "/inventory" },
  { key: "sales",       icon: ShoppingCart,    href: "/sales" },
  { key: "purchasing",  icon: Truck,           href: "/purchasing" },
  { key: "customers",   icon: Users,           href: "/customers" },
  { key: "accounting",  icon: Calculator,      href: "/accounting" },
  { key: "hr",          icon: UserCog,         href: "/hr" },
  { key: "reports",     icon: BarChart3,       href: "/reports" },
  { key: "permissions", icon: Shield,          href: "/permissions" },
  { key: "settings",    icon: Settings,        href: "/settings" },
] as const;

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { t } = useTranslation("shell");
  const { collapsed, toggleCollapsed } = useAppearance();

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "flex flex-col h-full bg-card border-e border-border transition-all duration-300",
          "[grid-area:nav]"
        )}
      >
        {/* Brand */}
        <div className={cn("flex items-center h-[var(--topbar-h)] px-4 border-b border-border shrink-0", collapsed && "justify-center px-0")}>
          {!collapsed ? (
            <span className="text-lg font-bold text-brand tracking-tight">Flexova</span>
          ) : (
            <span className="text-lg font-bold text-brand">F</span>
          )}
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-0.5 px-2">
            {NAV_ITEMS.map(({ key, icon: Icon, href }) => {
              const label = t(`nav.${key}`);
              return collapsed ? (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={href}
                      end={href === "/"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-center h-10 w-full rounded-sm transition-colors",
                          isActive
                            ? "bg-brand-tint text-brand-text"
                            : "text-muted-foreground hover:bg-background hover:text-foreground"
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="end">{label}</TooltipContent>
                </Tooltip>
              ) : (
                <NavLink
                  key={key}
                  to={href}
                  end={href === "/"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 h-10 px-3 rounded-sm text-sm transition-colors relative",
                      isActive
                        ? "bg-brand-tint text-brand-text font-medium before:absolute before:start-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-brand"
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Collapse toggle — desktop only */}
        <div className="hidden lg:flex p-2 border-t border-border">
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center h-8 w-full rounded-sm text-muted-foreground hover:bg-background hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300 rtl:-scale-x-100", collapsed && "rotate-180")} />
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
