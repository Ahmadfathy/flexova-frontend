/**
 * DD-2 §2.2/§2.8 — shared batch-status badges. Reuses the exact DD-1 warning-badge
 * convention (`Flag` icon + tint classes + i18n hint), never a new token: see
 * `EtaMissingFlag` in ItemsListPage.tsx and the `no_eta_code_hint` precedent this
 * whole convention traces back to (grep it before adding any new "warning chip"
 * anywhere in this app).
 */
import { Flag } from "lucide-react";
import type { TFunction } from "i18next";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import type { BatchStatus } from "./batches";

const PILL_VARIANT: Record<BatchStatus, PillVariant> = {
  active: "paid",
  depleted: "inactive",
  near_expiry: "credit",
  // "danger tint if it already exists in the codebase" (frontend spec §2.2) — it
  // does (bg-danger-tint/text-danger-text, used across ~70 files), via "rejected".
  expired: "rejected",
  hold: "credit",
};

const HAS_FLAG: Record<BatchStatus, boolean> = {
  active: false, depleted: false, near_expiry: true, expired: true, hold: true,
};

/** Full pill — used in the Batches tab list (§2.2). */
export function BatchStatusPill({ status, t, hint }: { status: BatchStatus; t: TFunction; hint?: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={hint}>
      <StatusPill variant={PILL_VARIANT[status]} label={t(`batch.status.${status}`)} />
      {HAS_FLAG[status] && <Flag className="h-3 w-3 shrink-0 text-current" />}
    </span>
  );
}

/** Compact icon-only flag — used for the Items-list rollup badge (§2.8), sized/styled
 *  to match `EtaMissingFlag` exactly so the two stack cleanly next to each other. */
export function BatchWarningFlag({ status, t }: { status: "expired" | "near_expiry"; t: TFunction }) {
  const cls =
    status === "expired"
      ? "bg-danger-tint text-danger-text"
      : "bg-warning-tint text-warning-text";
  return (
    <span
      title={t(`batch.${status === "expired" ? "expired_hint" : "near_expiry_hint"}`)}
      className={`inline-flex items-center gap-0.5 rounded ${cls} text-[10px] font-medium px-1 py-0.5 shrink-0`}
    >
      <Flag className="h-2.5 w-2.5" />
    </span>
  );
}
