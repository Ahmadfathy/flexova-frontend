import type { PosCartLine } from "@/stores/posRegister";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface TaxGroupTotal {
  tax_type_id: string;
  base: number;
  rate: number;
  amount: number;
}

export interface CartTotals {
  subtotal: number;
  lineDiscounts: number;
  ticketDiscount: number;
  taxByType: TaxGroupTotal[];
  tax: number;
  grandTotal: number;
}

export function lineGross(line: PosCartLine): number {
  return line.sold_by === "weight"
    ? (line.weight_kg ?? 0) * line.price
    : (line.qty ?? 0) * line.price;
}

export function lineTotal(line: PosCartLine): number {
  return Math.max(0, lineGross(line) - line.line_discount);
}

/** Ticket-level discount is distributed across tax groups proportionally to their net share. */
export function computeCartTotals(
  lines: PosCartLine[],
  ticketDiscount: number,
  taxRates: Record<string, number>
): CartTotals {
  const subtotal = lines.reduce((sum, l) => sum + lineGross(l), 0);
  const lineDiscounts = lines.reduce((sum, l) => sum + l.line_discount, 0);
  const netBeforeTicketDiscount = subtotal - lineDiscounts;
  const clampedTicketDiscount = Math.min(Math.max(0, ticketDiscount), Math.max(0, netBeforeTicketDiscount));

  const netByGroup = new Map<string, number>();
  for (const line of lines) {
    netByGroup.set(line.tax_type_id, (netByGroup.get(line.tax_type_id) ?? 0) + lineTotal(line));
  }

  const taxByType: TaxGroupTotal[] = Array.from(netByGroup.entries()).map(([tax_type_id, net]) => {
    const share = netBeforeTicketDiscount > 0 ? (clampedTicketDiscount * net) / netBeforeTicketDiscount : 0;
    const base = Math.max(0, net - share);
    const rate = taxRates[tax_type_id] ?? 0;
    return { tax_type_id, base, rate, amount: base * (rate / 100) };
  });

  const tax = taxByType.reduce((sum, g) => sum + g.amount, 0);
  const taxableBase = Math.max(0, netBeforeTicketDiscount - clampedTicketDiscount);

  return {
    subtotal,
    lineDiscounts,
    ticketDiscount: clampedTicketDiscount,
    taxByType,
    tax,
    grandTotal: taxableBase + tax,
  };
}
