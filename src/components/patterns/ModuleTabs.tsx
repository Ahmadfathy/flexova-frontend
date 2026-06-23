import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

/*
 * Routing-compatible tabs styled to match shadcn Tabs.
 * Uses NavLink for routing (so isActive drives the active style) instead
 * of Radix Tabs (which manages panel state, not URL state).
 * Visual language: TabsList container + TabsTrigger per item.
 */

interface Tab {
  label: string;
  href: string;
}

interface ModuleTabsProps {
  tabs: Tab[];
  className?: string;
}

export function ModuleTabs({ tabs, className }: ModuleTabsProps) {
  return (
    /* TabsList */
    <div className={cn("inline-flex h-10 items-center rounded-md bg-muted p-1 text-muted-foreground mb-6 overflow-x-auto max-w-full", className)}>
      {tabs.map(({ label, href }) => (
        <NavLink
          key={href}
          to={href}
          className={({ isActive }) =>
            cn(
              /* TabsTrigger */
              "inline-flex items-center justify-center whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground"
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  );
}
