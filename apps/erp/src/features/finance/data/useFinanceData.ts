import { useState, useEffect, useCallback } from "react";
import { mockFetch, loadFixture } from "@/lib/mock/client";

// ── Types ─────────────────────────────────────────────────────────

export interface Treasury {
  id: string;
  name_ar: string;
  name_en: string;
  type: "cash" | "bank" | "wallet";
  branch_id: string;
  balance: number;
  account_no?: string;
}

export interface ExpenseCategory {
  id: string;
  name_ar: string;
  name_en: string;
  icon: string;
  account: string;
}

export interface Expense {
  id: string;
  date: string;
  category_id: string;
  amount: number;
  method: string; // treasury_id
  memo: string;
  attachment: string | null;
}

export interface ReceiptVoucherAllocation {
  invoice_id: string;
  amount: number;
}

export interface ReceiptVoucher {
  id: string;
  number: string;
  date: string;
  customer_id: string;
  amount: number;
  treasury_id: string;
  allocations: ReceiptVoucherAllocation[];
  on_account: number;
  memo: string;
}

export interface PaymentVoucherAllocation {
  invoice_id: string;
  amount: number;
}

export interface PaymentVoucher {
  id: string;
  number: string;
  date: string;
  supplier_id: string;
  amount: number;
  treasury_id: string;
  allocations: PaymentVoucherAllocation[];
  memo: string;
}

export interface Transfer {
  id: string;
  number: string;
  date: string;
  from: string; // treasury_id
  to: string;   // treasury_id
  amount: number;
  memo: string;
}

export interface JournalEntryLine {
  account: string;
  dr: number;
  cr: number;
  memo: string;
}

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  type: "auto" | "manual";
  memo: string;
  source_ref?: string;
  lines: JournalEntryLine[];
  total_dr: number;
  total_cr: number;
  balanced: boolean;
}

export interface CoaAccount {
  code: string;
  name_ar: string;
  name_en: string;
  parent: string | null;
  type: "root" | "group" | "account";
  balance?: number;
}

export interface TrialBalanceRow {
  account: string;
  opening: number;
  dr: number;
  cr: number;
  closing: number;
}

export interface DashboardKpis {
  liquidity: number;
  net_cashflow_today: number;
  ar_total: number;
  ap_total: number;
  monthly_expenses: number;
  estimated_profit: number;
  top_expense_categories: Array<{ category_id: string; amount: number }>;
  overdue_receivables: Array<{ customer_id: string; amount: number; days_overdue: number }>;
}

export interface FiscalPeriod {
  id: string;
  month: number;
  year: number;
  status: "open" | "closed";
  close_type?: string;
}

// Cross-module reference types
export interface FinanceCustomer {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface FinanceSupplier {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface FinanceData {
  treasuries:         Treasury[];
  expenseCategories:  ExpenseCategory[];
  expenses:           Expense[];
  receiptVouchers:    ReceiptVoucher[];
  paymentVouchers:    PaymentVoucher[];
  transfers:          Transfer[];
  journalEntries:     JournalEntry[];
  chartOfAccounts:    CoaAccount[];
  trialBalance:       { period: string; rows: TrialBalanceRow[]; totals: { dr: number; cr: number; balanced: boolean } };
  dashboardKpis:      DashboardKpis;
  fiscalPeriods:      FiscalPeriod[];
  customers:          FinanceCustomer[];
  suppliers:          FinanceSupplier[];
}

// ── Hook ──────────────────────────────────────────────────────────

export function useFinanceData() {
  const [data, setData]       = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setIsOffline(false);
    try {
      const result = await mockFetch(
        async () => {
          const [acct, sales, purchasing] = await Promise.all([
            loadFixture<Record<string, unknown>>("accounting"),
            loadFixture<Record<string, unknown>>("sales"),
            loadFixture<Record<string, unknown>>("purchasing"),
          ]);
          return { acct, sales, purchasing };
        },
        null,
      );

      if (!result) {
        setData({
          treasuries: [], expenseCategories: [], expenses: [],
          receiptVouchers: [], paymentVouchers: [], transfers: [],
          journalEntries: [], chartOfAccounts: [],
          trialBalance: { period: "", rows: [], totals: { dr: 0, cr: 0, balanced: true } },
          dashboardKpis: {
            liquidity: 0, net_cashflow_today: 0, ar_total: 0, ap_total: 0,
            monthly_expenses: 0, estimated_profit: 0,
            top_expense_categories: [], overdue_receivables: [],
          },
          fiscalPeriods: [], customers: [], suppliers: [],
        });
        return;
      }

      const { acct, sales, purchasing } = result;
      setData({
        treasuries:        (acct as any).treasuries          ?? [],
        expenseCategories: (acct as any).expense_categories  ?? [],
        expenses:          (acct as any).expenses             ?? [],
        receiptVouchers:   (acct as any).receipt_vouchers    ?? [],
        paymentVouchers:   (acct as any).payment_vouchers    ?? [],
        transfers:         (acct as any).transfers            ?? [],
        journalEntries:    (acct as any).journal_entries     ?? [],
        chartOfAccounts:   (acct as any).chart_of_accounts   ?? [],
        trialBalance:      (acct as any).trial_balance       ?? { period: "", rows: [], totals: { dr: 0, cr: 0, balanced: true } },
        dashboardKpis:     (acct as any).dashboard_kpis      ?? {} as DashboardKpis,
        fiscalPeriods:     (acct as any).fiscal_periods      ?? [],
        customers:         ((sales as any).customers ?? []).map((c: any) => ({
          id: c.id, name_ar: c.name_ar, name_en: c.name_en,
        })),
        suppliers:         ((purchasing as any).suppliers ?? []).map((s: any) => ({
          id: s.id, name_ar: s.name_ar, name_en: s.name_en,
        })),
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "mock_offline") setIsOffline(true);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, isOffline, reload: load };
}
