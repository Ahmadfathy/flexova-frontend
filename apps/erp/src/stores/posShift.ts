import { create } from "zustand";
import { persist } from "zustand/middleware";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";
import accountingFixtures from "@/lib/mock/fixtures/accounting.fixtures.json";

const CURRENT_TERMINAL = posFixtures.terminals[0];
const SEED_SHIFT = posFixtures.shifts.find(
  s => s.terminal_id === CURRENT_TERMINAL.id && s.status === "open"
);
const TREASURY = accountingFixtures.treasuries.find(t => t.id === "tr_cash_main");

export interface PaidMovement {
  id: string;
  type: "in" | "out";
  amount: number;
  reason: string;
  at: string;
}

export type VarianceState = "balanced" | "short" | "over";

export interface TreasuryEntrySummary {
  id: string;
  treasuryId: string;
  treasuryNameAr: string;
  treasuryNameEn: string;
  amount: number;
  postedAt: string;
  status: "posted" | "queued";
}

export interface ClosedShiftSummary {
  zReportNo: string;
  openedAt: string;
  closedAt: string;
  cashierAr: string;
  cashierEn: string;
  openingFloat: number;
  salesCount: number;
  returnsCount: number;
  byTender: Record<string, number>;
  taxCollected: number;
  paidIn: number;
  paidOut: number;
  expectedCash: number;
  countedCash: number;
  variance: number;
  varianceState: VarianceState;
  treasuryEntry: TreasuryEntrySummary;
}

interface PosShiftState {
  status: "open" | "closed";
  openedAt: string | null;
  cashierAr: string;
  cashierEn: string;
  openingFloat: number;
  salesCount: number;
  returnsCount: number;
  byTender: Record<string, number>;
  taxCollected: number;
  paidIn: number;
  paidOut: number;
  paidMovements: PaidMovement[];
  zReportSeq: number;
  lastClosedShift: ClosedShiftSummary | null;

  openShift: (float: number) => void;
  recordSale: (tenders: Record<string, number>, tax: number) => void;
  addPaidMovement: (type: "in" | "out", amount: number, reason: string) => void;
  buildCloseSummary: (countedCash: number, isOnline: boolean) => ClosedShiftSummary;
  closeShift: (summary: ClosedShiftSummary) => void;
}

export function expectedCashOf(s: Pick<PosShiftState, "openingFloat" | "byTender" | "paidIn" | "paidOut">) {
  return s.openingFloat + (s.byTender.pm_cash ?? 0) + s.paidIn - s.paidOut;
}

export const usePosShift = create<PosShiftState>()(
  persist(
    (set, get) => ({
      status: SEED_SHIFT ? "open" : "closed",
      openedAt: SEED_SHIFT?.opened_at ?? null,
      cashierAr: SEED_SHIFT?.cashier_ar ?? "",
      cashierEn: SEED_SHIFT?.cashier_en ?? "",
      openingFloat: SEED_SHIFT?.opening_float ?? 0,
      salesCount: SEED_SHIFT?.running?.sales_count ?? 0,
      returnsCount: SEED_SHIFT?.running?.returns_count ?? 0,
      byTender: { ...(SEED_SHIFT?.running?.by_tender ?? {}) },
      taxCollected: 0,
      paidIn: SEED_SHIFT?.running?.paid_in ?? 0,
      paidOut: SEED_SHIFT?.running?.paid_out ?? 0,
      paidMovements: [],
      zReportSeq: 44,
      lastClosedShift: null,

      openShift: (float) => set({
        status: "open",
        openedAt: new Date().toISOString(),
        cashierAr: SEED_SHIFT?.cashier_ar ?? "",
        cashierEn: SEED_SHIFT?.cashier_en ?? "",
        openingFloat: float,
        salesCount: 0,
        returnsCount: 0,
        byTender: {},
        taxCollected: 0,
        paidIn: 0,
        paidOut: 0,
        paidMovements: [],
        lastClosedShift: null,
      }),

      recordSale: (tenders, tax) => set((s) => {
        const byTender = { ...s.byTender };
        for (const [method, amount] of Object.entries(tenders)) {
          if (amount > 0) byTender[method] = (byTender[method] ?? 0) + amount;
        }
        return { byTender, salesCount: s.salesCount + 1, taxCollected: s.taxCollected + tax };
      }),

      addPaidMovement: (type, amount, reason) => set((s) => ({
        paidMovements: [
          { id: crypto.randomUUID(), type, amount, reason, at: new Date().toISOString() },
          ...s.paidMovements,
        ],
        paidIn: type === "in" ? s.paidIn + amount : s.paidIn,
        paidOut: type === "out" ? s.paidOut + amount : s.paidOut,
      })),

      buildCloseSummary: (countedCash, isOnline) => {
        const s = get();
        const expectedCash = expectedCashOf(s);
        const variance = countedCash - expectedCash;
        const varianceState: VarianceState = variance === 0 ? "balanced" : variance < 0 ? "short" : "over";
        const seq = s.zReportSeq + 1;

        return {
          zReportNo: `${CURRENT_TERMINAL.number_prefix}-Z-${String(seq).padStart(4, "0")}`,
          openedAt: s.openedAt ?? new Date().toISOString(),
          closedAt: new Date().toISOString(),
          cashierAr: s.cashierAr,
          cashierEn: s.cashierEn,
          openingFloat: s.openingFloat,
          salesCount: s.salesCount,
          returnsCount: s.returnsCount,
          byTender: s.byTender,
          taxCollected: s.taxCollected,
          paidIn: s.paidIn,
          paidOut: s.paidOut,
          expectedCash,
          countedCash,
          variance,
          varianceState,
          treasuryEntry: {
            id: crypto.randomUUID(),
            treasuryId: "tr_cash_main",
            treasuryNameAr: TREASURY?.name_ar ?? "",
            treasuryNameEn: TREASURY?.name_en ?? "",
            amount: countedCash,
            postedAt: new Date().toISOString(),
            status: isOnline ? "posted" : "queued",
          },
        };
      },

      closeShift: (summary) => set((s) => ({
        status: "closed",
        lastClosedShift: summary,
        zReportSeq: s.zReportSeq + 1,
      })),
    }),
    { name: "flexova.pos.shift" }
  )
);
