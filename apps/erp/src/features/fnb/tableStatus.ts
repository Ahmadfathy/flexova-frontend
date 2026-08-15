import type { TableStatus } from "@/stores/fnbFloor";

/** Shared status → color mapping (FE_10 §3.C) — used by both the canvas tiles and the small-screen list, so both views read identically. */
export const TABLE_STATUS_TILE: Record<TableStatus, string> = {
  available: "bg-card border-border text-foreground hover:border-brand/40",
  occupied:  "bg-brand border-brand text-on-brand",
  reserved:  "bg-warning-tint border-warning text-warning-text",
  dirty:     "bg-muted border-muted-foreground/30 text-muted-foreground",
};

export const TABLE_STATUS_DOT: Record<TableStatus, string> = {
  available: "bg-muted-foreground/40",
  occupied:  "bg-on-brand",
  reserved:  "bg-warning",
  dirty:     "bg-muted-foreground",
};
