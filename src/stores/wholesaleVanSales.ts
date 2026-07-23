import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface VanSaleLine {
  item_id: string;
  qty: number;
  uom_id: string;
  price: number;
  discount: number;
  line_total: number;
  eta_code_missing: boolean;
}

export interface VanSaleTotals {
  subtotal: number;
  discount: number;
  taxable_base: number;
  tax: number;
  grand_total: number;
}

export interface VanSale {
  id: string;
  number: string;
  visit_id: string;
  customer_id: string;
  rep_id: string;
  date: string;
  lines: VanSaleLine[];
  totals: VanSaleTotals;
  tenders: Record<string, number>;
  /** flag-don't-block (FE_13 §3.3) — at least one line had no eta_code at sale time. */
  needs_eta_fix: boolean;
}

interface WholesaleVanSalesState {
  sales: VanSale[];
  addSale: (sale: VanSale) => void;
}

/**
 * Direct van sales (FE_13 §3.3 "direct invoice") — a wholesale sales order/
 * delivery-note pair is the wrong model here since the van path explicitly
 * skips that pipeline (tenant default "فاتورة مباشرة" for Van, per UIUX_13 §2
 * decision 3). Kept as its own lightweight record rather than routed through
 * `wholesaleOrders`.
 */
export const useWholesaleVanSales = create<WholesaleVanSalesState>()(
  persist(
    (set) => ({
      sales: [],
      addSale: (sale) => set((s) => ({ sales: [sale, ...s.sales] })),
    }),
    { name: "flexova.wholesale.van_sales" },
  ),
);

export function nextVanSaleNumber(sales: VanSale[]): string {
  const max = sales.reduce((m, s) => {
    const n = parseInt(s.number.replace(/\D/g, ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 9000);
  return `WH-VS-${max + 1}`;
}
