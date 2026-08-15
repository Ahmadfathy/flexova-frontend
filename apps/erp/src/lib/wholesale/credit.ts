/**
 * FE_13 §3.3/§5/§9 — wholesale credit availability & policy guard.
 * Pure functions over fixture data — no React, no i18n (callers localize).
 */
import type { CreditPolicy, CreditReservation, WholesaleCustomer } from "@/types/wholesale";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Open (still-reserved) reservations for a customer. A reservation is released
 * only when its order is invoiced or cancelled — at that point the fixture no
 * longer carries a "reserved" row for it (never double-count against `ar_balance`,
 * which already reflects invoiced orders).
 */
export function getOpenReservations(customerId: string, reservations: CreditReservation[]): CreditReservation[] {
  return reservations.filter((r) => r.customer_id === customerId && r.status === "reserved");
}

export function getAvailableCredit(customer: WholesaleCustomer, reservations: CreditReservation[]): number {
  const reserved = getOpenReservations(customer.id, reservations).reduce((sum, r) => sum + r.amount, 0);
  return round2(customer.credit_limit - customer.ar_balance - reserved);
}

export interface CreditSnapshot {
  limit: number;
  /** AR balance (already-invoiced debt). */
  used: number;
  /** Sum of open (not yet invoiced/cancelled) reservations. */
  reserved: number;
  available: number;
  /** (used + reserved) / limit — drives CreditBar tone. */
  usedPct: number;
}

export function getCreditSnapshot(customer: WholesaleCustomer, reservations: CreditReservation[]): CreditSnapshot {
  const reserved = round2(getOpenReservations(customer.id, reservations).reduce((sum, r) => sum + r.amount, 0));
  const used = customer.ar_balance;
  const available = round2(customer.credit_limit - used - reserved);
  const usedPct = customer.credit_limit > 0 ? (used + reserved) / customer.credit_limit : 0;
  return { limit: customer.credit_limit, used, reserved, available, usedPct };
}

export type CreditTone = "success" | "warning" | "danger";

/** danger on breach (available < 0) · warning at >=80% used · success otherwise. */
export function creditTone(snapshot: CreditSnapshot): CreditTone {
  if (snapshot.available < 0) return "danger";
  if (snapshot.usedPct >= 0.8) return "warning";
  return "success";
}

// ── Credit guard (FE_13 §3.3/§5) ───────────────────────────────────────

export interface CreditPolicyEvaluation {
  /** Whether the tender/approval can proceed right now. */
  allowed: boolean;
  mode: CreditPolicy;
  /** amount - availableCredit. Positive = insufficient credit. */
  excess: number;
  availableCredit: number;
  /** True when mode==='override', credit is insufficient, and override hasn't been confirmed yet. */
  requiresOverrideConfirm: boolean;
}

/**
 * Pure decision core for the credit guard — resolution order per §3.3/§5:
 * sufficient credit always allows; otherwise `warn` allows-with-message,
 * `block` disallows, `override` disallows until `overrideConfirmed`.
 */
export function evaluateCreditPolicy(
  customer: WholesaleCustomer,
  amount: number,
  reservations: CreditReservation[],
  overrideConfirmed = false,
): CreditPolicyEvaluation {
  const availableCredit = getAvailableCredit(customer, reservations);
  const excess = round2(amount - availableCredit);
  const mode = customer.credit_policy;

  if (excess <= 0) {
    return { allowed: true, mode, excess, availableCredit, requiresOverrideConfirm: false };
  }
  if (mode === "warn") {
    return { allowed: true, mode, excess, availableCredit, requiresOverrideConfirm: false };
  }
  if (mode === "block") {
    return { allowed: false, mode, excess, availableCredit, requiresOverrideConfirm: false };
  }
  // override
  return {
    allowed: overrideConfirmed,
    mode,
    excess,
    availableCredit,
    requiresOverrideConfirm: !overrideConfirmed,
  };
}
