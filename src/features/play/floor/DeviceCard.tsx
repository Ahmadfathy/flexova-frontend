import type { LucideIcon } from "lucide-react";
import { UtensilsCrossed, ArrowUp, ArrowDown, AlertTriangle, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DeviceState } from "@/features/play/types";

export const DEVICE_STATE_TILE: Record<DeviceState, string> = {
  free: "bg-card border-border text-foreground hover:border-brand/40",
  busy: "bg-brand border-brand text-on-brand",
  reserved: "bg-warning-tint border-warning text-warning-text",
  paused: "bg-warning-tint border-warning text-warning-text",
  out_of_service: "bg-danger-tint border-danger text-danger-text",
};

export interface DeviceCardMenuItem {
  label: string;
  onSelect: () => void;
}

interface DeviceCardProps {
  name: string;
  Icon: LucideIcon;
  state: DeviceState;
  stateLabel: string;
  counterText?: string;
  counterDirection?: "up" | "down";
  runningTotalText?: string;
  hasCafeteria?: boolean;
  /** Prepaid remaining time dropped below `prepaid_block_threshold_min` (§5.6) — a semantic
   * warning highlight layered on top of whatever `state` color already applies (the device is
   * still plain "busy", this is purely a time-based overlay). */
  nearEmpty?: boolean;
  note?: string;
  onClick?: () => void;
  /** Reserve/Maintenance quick actions (§5.8) — an overflow menu rendered as a SIBLING of the
   * card's own button (never nested inside it: two interactive buttons cannot nest), same
   * structure as F&B's `TableTile` overflow menu. Only free devices carry one today. */
  menu?: DeviceCardMenuItem[];
  menuLabel?: string;
}

/** One device tile on the Floor Grid — semantic color per state, live counter (already
 * computed by the caller from the shared tick, never a per-card timer), running total, and
 * a small cafeteria badge. Also reused for the ticket-zone's active-ticket mini-cards. */
export function DeviceCard({
  name, Icon, state, stateLabel, counterText, counterDirection, runningTotalText, hasCafeteria, nearEmpty, note, onClick, menu, menuLabel,
}: DeviceCardProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 text-center shadow-sm transition-colors min-h-[112px]",
          DEVICE_STATE_TILE[state],
          nearEmpty && "ring-2 ring-warning ring-offset-1 animate-pulse"
        )}
      >
        {hasCafeteria && (
          <span className="absolute -top-2 -end-2 h-6 w-6 rounded-full bg-warning text-on-brand flex items-center justify-center shadow">
            <UtensilsCrossed className="h-3 w-3" />
          </span>
        )}
        {nearEmpty && (
          <span className="absolute -top-2 -start-2 h-6 w-6 rounded-full bg-warning text-on-brand flex items-center justify-center shadow">
            <AlertTriangle className="h-3 w-3" />
          </span>
        )}

        <Icon className="h-5 w-5 opacity-80" />
        <span className="text-sm font-semibold truncate max-w-full">{name}</span>
        <span className="text-[11px] opacity-80">{stateLabel}</span>

        {counterText && (
          <span className="inline-flex items-center gap-0.5 text-sm font-bold tabular-nums" dir="ltr">
            {counterDirection === "down" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
            {counterText}
          </span>
        )}
        {runningTotalText && (
          <span className="text-xs font-semibold tabular-nums">{runningTotalText}</span>
        )}
        {note && <span className="text-[10px] truncate max-w-full opacity-80">{note}</span>}
      </button>

      {menu && menu.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              aria-label={menuLabel}
              className="absolute -top-2 -end-2 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow hover:bg-muted"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menu.map((item, i) => (
              <DropdownMenuItem key={i} onSelect={item.onSelect}>{item.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
