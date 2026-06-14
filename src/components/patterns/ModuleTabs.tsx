import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

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
    <div className={cn("border-b border-border mb-6 overflow-x-auto", className)}>
      <nav className="flex gap-0 -mb-px min-w-max">
        {tabs.map(({ label, href }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
