import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";

export type ListRowTone = "brand" | "success" | "warning" | "danger" | "muted";

const ICON_WRAP: Record<ListRowTone, string> = {
  brand:   "bg-brand-tint   text-brand",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger:  "bg-danger-tint  text-danger",
  muted:   "bg-muted        text-muted-foreground",
};

export interface ListRowProps {
  /** Content for the leading tinted box (icon, avatar, etc.) */
  leading: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Trailing slot: value text, Badge, action buttons, etc. */
  trailing?: React.ReactNode;
  /** Show a directional chevron on the logical end */
  chevron?: boolean;
  tone?: ListRowTone;
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  chevron = false,
  tone = "muted",
  onClick,
  className,
}: ListRowProps) {
  const { density, lang } = useAppearance();
  const isCompact = density === "compact";
  const isRtl     = lang === "ar";
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  const Tag = (onClick ? "button" : "div") as React.ElementType;

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 border-b border-border last:border-0 text-start",
        isCompact ? "py-2.5" : "py-3.5",
        onClick && [
          "cursor-pointer",
          "hover:bg-muted/50",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:bg-muted/50",
        ],
        className
      )}
    >
      {/* Leading tinted icon/avatar box */}
      <span
        className={cn(
          "shrink-0 flex items-center justify-center rounded",
          isCompact ? "h-8 w-8" : "h-10 w-10",
          ICON_WRAP[tone]
        )}
      >
        {leading}
      </span>

      {/* Title + subtitle stack */}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-foreground truncate leading-snug">
          {title}
        </span>
        {subtitle && (
          <span className="block text-xs text-muted-foreground truncate mt-0.5 leading-normal">
            {subtitle}
          </span>
        )}
      </span>

      {/* Trailing slot */}
      {trailing && (
        <span className="shrink-0 flex items-center gap-1.5">
          {trailing}
        </span>
      )}

      {/* Directional chevron */}
      {chevron && (
        <ChevronIcon className="shrink-0 h-4 w-4 text-muted-foreground/50" aria-hidden />
      )}
    </Tag>
  );
}
