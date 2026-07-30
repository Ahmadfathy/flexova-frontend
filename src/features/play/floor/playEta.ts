/**
 * e-receipt/ETA simulation for End & Bill (FE_15 §5.7) — mirrors `svc/etaSim.ts`'s shape
 * (a single result carrying the 48h B2C queue window), not repair's plainer string-only
 * `RprEtaStatus`, since Play explicitly needs "the e-receipt queues with the B2C window
 * countdown" when offline. `docTypeFor` mirrors repair's `releaseEta.ts` — B2B (has TRN) →
 * e-invoice, B2C → e-receipt, the same routing rule used across every module.
 */

export type PlayEtaChannel = "e_invoice" | "e_receipt";
export type PlaySyncStatus = "valid" | "queued" | "flagged_missing_code";

export interface PlayEtaResult {
  channel: PlayEtaChannel;
  syncStatus: PlaySyncStatus;
  uuid?: string;
  accepted_at?: string;
  queued_at?: string;
  window_deadline?: string;
  window_remaining_hours?: number;
}

export function docTypeFor(hasTrn: boolean): PlayEtaChannel {
  return hasTrn ? "e_invoice" : "e_receipt";
}

/**
 * flag-don't-block (§5.7): a missing `eta_code` on the device type's service item blocks
 * ISSUE only — checked before online/offline, since it's a data problem, not a connectivity
 * one, and it never prevents the session from ending (the caller must still transition the
 * session to "paid" regardless of this result).
 */
export function simulateEta(opts: { hasTrn: boolean; isOnline: boolean; missingEtaCode: boolean }): PlayEtaResult {
  const channel = docTypeFor(opts.hasTrn);

  if (opts.missingEtaCode) {
    return { channel, syncStatus: "flagged_missing_code" };
  }

  if (!opts.isOnline) {
    const now = new Date();
    const deadline = new Date(now.getTime() + 48 * 3600 * 1000);
    return {
      channel,
      syncStatus: "queued",
      queued_at: now.toISOString(),
      window_deadline: deadline.toISOString(),
      window_remaining_hours: 48,
    };
  }

  return { channel, syncStatus: "valid", uuid: crypto.randomUUID(), accepted_at: new Date().toISOString() };
}
