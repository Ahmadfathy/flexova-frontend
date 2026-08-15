import { round2 } from "@/features/pos/posTotals";
import type { FnbCheck, FnbCheckLine } from "@/stores/fnbOrder";

export interface FnbBillTotals {
  subtotal: number;
  serviceCharge: number;
  tips: number;
  deliveryFee: number;
  taxableBase: number;
  tax: number;
  grandTotal: number;
}

export function lineNet(line: FnbCheckLine): number {
  return (line.price + line.modifiers.reduce((s, m) => s + m.delta, 0)) * line.qty;
}

export function billableLines(check: FnbCheck): FnbCheckLine[] {
  return check.lines.filter(l => l.status !== "void");
}

export function computeBillTotals(check: FnbCheck, taxRates: Record<string, number>): FnbBillTotals {
  const lines = billableLines(check);
  const subtotal = lines.reduce((sum, l) => sum + lineNet(l), 0);
  const serviceCharge = round2(subtotal * (check.service_charge_pct / 100));
  const deliveryFee = check.type === "delivery" ? check.delivery_fee : 0;

  const byTax = new Map<string, number>();
  for (const l of lines) byTax.set(l.tax_type_id, (byTax.get(l.tax_type_id) ?? 0) + lineNet(l));
  let tax = 0;
  for (const [taxId, base] of byTax) tax += base * ((taxRates[taxId] ?? 0) / 100);
  tax = round2(tax);

  const tips = round2(check.tips);
  const grandTotal = round2(subtotal + serviceCharge + tips + deliveryFee + tax);

  return { subtotal: round2(subtotal), serviceCharge, tips, deliveryFee, taxableBase: round2(subtotal), tax, grandTotal };
}

/** Splits `grandTotal` into `n` equal shares, adjusting the last one so they sum exactly. */
export function splitEqually(grandTotal: number, n: number): number[] {
  if (n <= 0) return [];
  const share = round2(grandTotal / n);
  const amounts = Array.from({ length: n - 1 }, () => share);
  const last = round2(grandTotal - amounts.reduce((s, a) => s + a, 0));
  return [...amounts, last];
}

/**
 * Splits `grandTotal` proportionally to each group's net line-contribution.
 * `assignments` maps lineId → the (1-based) group indices sharing that line
 * (a line assigned to k groups contributes 1/k of its net to each). The last
 * non-empty group absorbs the rounding remainder so amounts sum exactly.
 */
export function splitByAssignment(
  lines: FnbCheckLine[],
  assignments: Record<string, number[]>,
  groupCount: number,
  grandTotal: number
): { lineIds: string[]; amount: number }[] {
  const contribution = Array.from({ length: groupCount }, () => 0);
  const lineIdsByGroup: string[][] = Array.from({ length: groupCount }, () => []);

  for (const line of lines) {
    const groups = assignments[line.id];
    if (!groups || groups.length === 0) continue;
    const share = lineNet(line) / groups.length;
    for (const g of groups) {
      contribution[g - 1] += share;
      lineIdsByGroup[g - 1].push(line.id);
    }
  }

  const totalNet = contribution.reduce((s, c) => s + c, 0);
  if (totalNet <= 0) return contribution.map((_, i) => ({ lineIds: lineIdsByGroup[i], amount: 0 }));

  const amounts = contribution.map(c => round2((c / totalNet) * grandTotal));
  const lastNonEmpty = [...amounts.keys()].reverse().find(i => lineIdsByGroup[i].length > 0) ?? amounts.length - 1;
  const othersSum = amounts.reduce((s, a, i) => (i === lastNonEmpty ? s : s + a), 0);
  amounts[lastNonEmpty] = round2(grandTotal - othersSum);

  return amounts.map((amount, i) => ({ lineIds: lineIdsByGroup[i], amount }));
}
