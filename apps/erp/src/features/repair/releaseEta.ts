import type { RprFinalDocumentLine } from "./catalog";

export type RprEtaStatus = "accepted" | "flagged_missing_code" | "queued" | "rejected";

/** Shallow ETA simulation, same depth as svc/etaSim.ts (no live ETA service exists anywhere
 * in this codebase — POS/F&B/svc settle never call a real one either). Unlike svc's version,
 * "missing eta_code" here is its own outcome (`flagged_missing_code`) rather than a per-line
 * badge only — it drives `RprFinalDocument.eta_status` directly, matching the pre-seeded
 * `doc_rpr_5005` fixture (flagged, still `posted: true` — flag-don't-block, golden rule #3). */
export function computeEtaStatus(lines: RprFinalDocumentLine[], isOnline: boolean, forceReject: boolean): RprEtaStatus {
  if (forceReject) return "rejected";
  if (lines.some((l) => l._flag === "no_eta_code")) return "flagged_missing_code";
  if (!isOnline) return "queued";
  return "accepted";
}

/** B2B (has TRN) → e-invoice; B2C → e-receipt — same routing rule used by svc/F&B/POS. */
export function docTypeFor(hasTrn: boolean): "e_invoice" | "e_receipt" {
  return hasTrn ? "e_invoice" : "e_receipt";
}
