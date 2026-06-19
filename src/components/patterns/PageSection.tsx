import React from "react";
import { cn } from "@/lib/utils";
import { Card as ShadCard } from "@/components/ui/card";

export interface PageSectionProps {
  /** Section heading rendered in a `px-6 py-4 border-b` row. */
  title?: string;
  /** Muted secondary line below the title. */
  subtitle?: string;
  /**
   * Trailing slot inside the header row — use for filter buttons, "Add" CTAs, etc.
   * Rendered in the logical `end` position regardless of direction.
   */
  actions?: React.ReactNode;
  /**
   * When `true` (default) the content div receives `p-6`.
   * Pass `false` for full-bleed content like tables, maps, or images that
   * need to reach the card edges; they manage their own internal padding.
   */
  padded?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function PageSection({
  title,
  subtitle,
  actions,
  padded = true,
  className,
  children,
}: PageSectionProps) {
  const hasTitle   = Boolean(title || subtitle);
  const hasActions = Boolean(actions);
  const hasHeader  = hasTitle || hasActions;

  return (
    /*
     * overflow-hidden: clips children (e.g. table rows) to the card's
     * border-radius without creating a scroll container, so sticky
     * table headers still track the parent <main> scroll.
     */
    <ShadCard className={cn("overflow-hidden", className)}>
      {hasHeader && (
        <div
          className={cn(
            "flex items-center gap-4 px-6 py-4 border-b border-border",
            hasTitle && hasActions
              ? "justify-between"
              : hasActions
              ? "justify-end"
              : "justify-start"
          )}
        >
          {hasTitle && (
            <div className="min-w-0 flex-1">
              {title && (
                <p className="text-sm font-semibold leading-5 text-foreground truncate">
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {hasActions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Content area — padded by default, bare for full-bleed layouts */}
      <div className={padded ? "p-6" : undefined}>
        {children}
      </div>
    </ShadCard>
  );
}
