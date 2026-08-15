import type { SvcTicketLine } from "@/stores/svcTickets";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineGross(line: SvcTicketLine): number {
  return line.qty * line.price;
}

/** Net of the line's own discount — package-covered lines still carry their full gross for display. */
export function lineNet(line: SvcTicketLine): number {
  return Math.max(0, lineGross(line) - line.line_discount);
}

export interface TaxGroupTotal {
  tax_type_id: string;
  base: number;
  rate: number;
  amount: number;
}

export interface TicketTotals {
  subtotal: number;
  lineDiscounts: number;
  coverage: number;
  ticketDiscount: number;
  taxByType: TaxGroupTotal[];
  tax: number;
  taxableBase: number;
  grandTotal: number;
  /** grandTotal minus any package-covered lines — the amount actually due via tender. */
  payable: number;
}

/**
 * Mirrors POS's `computeCartTotals` (posTotals.ts) with one addition: package-covered
 * lines contribute their gross to `subtotal` (so the receipt still shows the full service
 * value) but are excluded from the taxable/payable math entirely — no cash, no tax, no
 * ticket-discount share for a session that was already paid for when the package was sold.
 */
export function computeTicketTotals(
  lines: SvcTicketLine[],
  ticketDiscount: number,
  taxRates: Record<string, number>
): TicketTotals {
  const payableLines = lines.filter((l) => !l.package_covered);

  const subtotal = lines.reduce((sum, l) => sum + lineGross(l), 0);
  const coverage = lines.filter((l) => l.package_covered).reduce((sum, l) => sum + lineNet(l), 0);
  const lineDiscounts = payableLines.reduce((sum, l) => sum + l.line_discount, 0);

  const netBeforeTicketDiscount = payableLines.reduce((sum, l) => sum + lineNet(l), 0);
  const clampedTicketDiscount = Math.min(Math.max(0, ticketDiscount), Math.max(0, netBeforeTicketDiscount));

  const netByGroup = new Map<string, number>();
  for (const line of payableLines) {
    netByGroup.set(line.tax_type_id, (netByGroup.get(line.tax_type_id) ?? 0) + lineNet(line));
  }

  const taxByType: TaxGroupTotal[] = Array.from(netByGroup.entries()).map(([tax_type_id, net]) => {
    const share = netBeforeTicketDiscount > 0 ? (clampedTicketDiscount * net) / netBeforeTicketDiscount : 0;
    const base = Math.max(0, net - share);
    const rate = taxRates[tax_type_id] ?? 0;
    return { tax_type_id, base, rate, amount: round2(base * (rate / 100)) };
  });

  const tax = round2(taxByType.reduce((sum, g) => sum + g.amount, 0));
  const taxableBase = Math.max(0, netBeforeTicketDiscount - clampedTicketDiscount);
  const grandTotal = round2(taxableBase + tax);

  return {
    subtotal: round2(subtotal),
    lineDiscounts: round2(lineDiscounts),
    coverage: round2(coverage),
    ticketDiscount: round2(clampedTicketDiscount),
    taxByType,
    tax,
    taxableBase: round2(taxableBase),
    grandTotal,
    payable: grandTotal,
  };
}
