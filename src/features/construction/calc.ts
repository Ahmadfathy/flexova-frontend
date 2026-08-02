export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * The claim engine (spec §6.4 / §4.3's preview card use the exact same formula):
 *   retention_this = min(rate × gross, cap − accumulated_so_far)   [uncapped if cap is null]
 *   advance_recovery_this = min(recovery_pct × gross, advance_amount − recovered_so_far)
 *   vat = vat_rate × gross                                          (never on net)
 *   net_before_vat = gross − retention_this − advance_recovery_this
 *   net_payable = net_before_vat + vat
 *
 * Verified to reproduce `claim_001`/`claim_002` from the fixture exactly (incl. the
 * retention-cap hit and the advance fully-recovered case) when called with the real
 * accumulated/recovered-so-far figures. S3's "hypothetical 100,000 claim" preview
 * calls this with `retentionAccumulatedSoFar: 0, advanceRecoveredSoFar: 0` (spec §4.3
 * asks for a standalone illustration under the current terms, not the project's real
 * history) — S5's real engine will call it with the project's actual running totals.
 */
export interface ClaimPreviewInput {
  grossCurrent: number;
  retentionRate: number; // 0-1
  retentionCap: number | null; // absolute EGP, null = uncapped
  retentionAccumulatedSoFar: number;
  advanceAmount: number;
  advanceRecoveryPct: number; // 0-1
  advanceRecoveredSoFar: number;
  vatRate: number; // 0-1
}

export interface ClaimPreviewResult {
  grossCurrent: number;
  retentionThis: number;
  advanceRecoveryThis: number;
  netBeforeVat: number;
  vat: number;
  netPayable: number;
}

/**
 * §5.2 live impact card — value/cost delta a single VO line would apply to the BOQ.
 * Shared by the VO editor's live preview and the store's approval mutation, so they
 * can never compute a different number for the same line.
 */
export interface VoLineImpactInput {
  type: "add_item" | "modify_qty" | "modify_price";
  new_item?: { estimated_qty: number; unit_price: number; estimated_unit_cost: number };
  new_qty?: number;
  new_price?: number;
  target?: { estimated_qty: number; unit_price: number; estimated_unit_cost: number };
}

export function computeVoLineImpact(line: VoLineImpactInput): { valueImpact: number; costImpact: number } {
  if (line.type === "add_item" && line.new_item) {
    return {
      valueImpact: round2(line.new_item.estimated_qty * line.new_item.unit_price),
      costImpact: round2(line.new_item.estimated_qty * line.new_item.estimated_unit_cost),
    };
  }
  if (line.type === "modify_qty" && line.target && line.new_qty != null) {
    const deltaQty = line.new_qty - line.target.estimated_qty;
    return {
      valueImpact: round2(deltaQty * line.target.unit_price),
      costImpact: round2(deltaQty * line.target.estimated_unit_cost),
    };
  }
  if (line.type === "modify_price" && line.target && line.new_price != null) {
    const deltaPrice = line.new_price - line.target.unit_price;
    return { valueImpact: round2(deltaPrice * line.target.estimated_qty), costImpact: 0 };
  }
  return { valueImpact: 0, costImpact: 0 };
}

export function computeClaimPreview(input: ClaimPreviewInput): ClaimPreviewResult {
  const {
    grossCurrent, retentionRate, retentionCap, retentionAccumulatedSoFar,
    advanceAmount, advanceRecoveryPct, advanceRecoveredSoFar, vatRate,
  } = input;

  const rawRetention = round2(grossCurrent * retentionRate);
  const retentionRemaining = retentionCap != null ? Math.max(0, retentionCap - retentionAccumulatedSoFar) : Infinity;
  const retentionThis = round2(Math.min(rawRetention, retentionRemaining));

  const rawAdvanceRecovery = round2(grossCurrent * advanceRecoveryPct);
  const advanceRemaining = Math.max(0, advanceAmount - advanceRecoveredSoFar);
  const advanceRecoveryThis = round2(Math.min(rawAdvanceRecovery, advanceRemaining));

  const vat = round2(grossCurrent * vatRate);
  const netBeforeVat = round2(grossCurrent - retentionThis - advanceRecoveryThis);
  const netPayable = round2(netBeforeVat + vat);

  return { grossCurrent, retentionThis, advanceRecoveryThis, netBeforeVat, vat, netPayable };
}
