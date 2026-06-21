import { useState, useEffect, useCallback } from "react";
import { mockFetch, loadFixture } from "@/lib/mock/client";

// ── Inventory-sourced types ──────────────────────────────────────
export interface InventoryItem {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  item_type: string;
  base_uom_id: string;
  tax_type_id: string;
  eta_code: string;
  status: string;
  incomplete: boolean;
  prices: Record<string, number>;
  balances: { warehouse_id: string; qty: number }[];
}

export interface TaxType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  rate: number;
}

export interface UOM {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface Warehouse {
  id: string;
  name_ar: string;
  name_en: string;
  branch_id: string;
  is_default: boolean;
}

export interface Branch {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface PriceList {
  id: string;
  name_ar: string;
  name_en: string;
  is_default: boolean;
}

// ── Sales-sourced types ──────────────────────────────────────────
export interface SalesInvoiceLine {
  item_id: string;
  description: string;
  qty: number;
  uom_id: string;
  price: number;
  line_discount: number;
  tax_type_id: string;
  line_total: number;
}

export interface SalesInvoiceEta {
  uuid?: string | null;
  long_id?: string;
  accepted_at?: string;
  qr?: string;
  environment?: string;
  rejected_at?: string;
  reason_ar?: string;
  reason_en?: string;
  offending_field?: string;
  raw_code?: string;
  submitted_at?: string;
  queued_at?: string;
  window_deadline?: string;
  window_remaining_hours?: number;
  note_ar?: string;
  note_en?: string;
}

export type EtaStatus =
  | "draft" | "unsent" | "queued" | "clearing"
  | "valid" | "rejected" | "cancelled" | "buyer_rejected";

export type PaymentStatus = "paid" | "partial" | "credit" | "returned";

export interface SalesInvoice {
  id: string;
  number: string;
  branch_id: string;
  date: string;
  customer_id: string;
  channel: "e-invoice" | "e-receipt";
  payment_method: string;
  warehouse_id: string;
  payment_status: PaymentStatus;
  eta_status: EtaStatus;
  eta: SalesInvoiceEta;
  lines: SalesInvoiceLine[];
  totals: {
    subtotal: number;
    discount: number;
    taxable_base: number;
    tax: number;
    grand_total: number;
  };
  collected: number;
  balance: number;
  linked_credit_note?: string;
  _submit_blockers?: string[];
  _flag?: string;
}

export interface Treasury {
  id: string;
  name_ar: string;
  name_en: string;
  type: "cash" | "bank";
}

// ── Credit / Debit note types ────────────────────────────────────
export interface NoteLine {
  item_id: string;
  qty: number;
  uom_id: string;
  price: number;
  line_total: number;
}

export interface CreditNote {
  id: string;
  number: string;
  source_invoice: string;
  date: string;
  customer_id: string;
  reason_ar: string;
  reason_en: string;
  eta_status: EtaStatus;
  eta: { uuid?: string; accepted_at?: string; environment?: string };
  lines: NoteLine[];
  totals: { value: number };
  remaining_noteable: number;
}

export interface DebitNote {
  id: string;
  number: string;
  source_invoice: string;
  date: string;
  customer_id: string;
  reason_ar: string;
  reason_en: string;
  eta_status: EtaStatus;
  eta: { uuid?: string; accepted_at?: string; environment?: string };
  lines: NoteLine[];
  totals: { value: number };
}

// ── Quotation types ──────────────────────────────────────────────
export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface QuotationLine {
  item_id: string;
  qty: number;
  uom_id: string;
  price: number;
  line_total: number;
}

export interface Quotation {
  id: string;
  number: string;
  date: string;
  customer_id: string;
  status: QuotationStatus;
  valid_until: string;
  lines: QuotationLine[];
  totals: { subtotal: number; tax: number; grand_total: number };
}

// ── ETA Hub types ────────────────────────────────────────────────
export interface EtaHubKpis {
  acceptance_rate: number;
  nearing_window: number;
  rejected: number;
  compliance_tier: number;
}

export interface EtaHubAlert {
  level: "warning" | "danger" | "info";
  key: string;
  text_ar: string;
  text_en: string;
}

export interface EtaRejectionReason {
  reason_ar: string;
  reason_en: string;
  count: number;
}

export interface EtaHub {
  kpis: EtaHubKpis;
  alerts: EtaHubAlert[];
  top_rejection_reasons: EtaRejectionReason[];
}

// ── Receipt type ─────────────────────────────────────────────────
export interface Receipt {
  id: string;
  number: string;
  date: string;
  customer_id: string;
  invoice_id: string;
  amount: number;
  method: string;
  treasury_id: string;
}

export interface SalesCustomer {
  id: string;
  name_ar: string;
  name_en: string;
  type: "b2b" | "b2c";
  trn: string | null;
  uin: string | null;
  price_list_id: string;
  default_payment: string;
}

export interface PaymentMethod {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface EtaSettings {
  trn: string;
  activity_ar?: string;
  activity_en?: string;
  eseal: { configured: boolean; type: string; expires: string };
  environment: string;
  test_mode: boolean;
  numbering?: {
    mode: string;
    branches: Record<string, { prefix: string; next: number }>;
  };
  send_behavior?: { b2b: string; b2c: string };
  enabled_tax_types?: string[];
}

export interface SalesData {
  customers: SalesCustomer[];
  paymentMethods: PaymentMethod[];
  etaSettings: EtaSettings;
  items: InventoryItem[];
  taxTypes: TaxType[];
  uoms: UOM[];
  warehouses: Warehouse[];
  branches: Branch[];
  priceLists: PriceList[];
  invoices: SalesInvoice[];
  treasuries: Treasury[];
  creditNotes: CreditNote[];
  debitNotes: DebitNote[];
  quotations: Quotation[];
  receipts: Receipt[];
  etaHub: EtaHub;
}

// ── Internal fixture shapes ──────────────────────────────────────
interface InventoryFixtureSlim {
  items: InventoryItem[];
  tax_types: TaxType[];
  uoms: UOM[];
  warehouses: Warehouse[];
  branches: Branch[];
  price_lists: PriceList[];
  [k: string]: unknown;
}

interface SalesFixtureSlim {
  customers: SalesCustomer[];
  payment_methods: PaymentMethod[];
  eta_settings: EtaSettings;
  invoices: SalesInvoice[];
  treasuries: Treasury[];
  credit_notes: CreditNote[];
  debit_notes: DebitNote[];
  quotations: Quotation[];
  receipts: Receipt[];
  eta_hub: EtaHub;
  [k: string]: unknown;
}

const EMPTY: SalesData = {
  customers: [],
  paymentMethods: [],
  etaSettings: {
    trn: "",
    eseal: { configured: false, type: "", expires: "" },
    environment: "sandbox",
    test_mode: true,
  },
  items: [],
  taxTypes: [],
  uoms: [],
  warehouses: [],
  branches: [],
  priceLists: [],
  invoices: [],
  treasuries: [],
  creditNotes: [],
  debitNotes: [],
  quotations: [],
  receipts: [],
  etaHub: {
    kpis: { acceptance_rate: 100, nearing_window: 0, rejected: 0, compliance_tier: 1 },
    alerts: [],
    top_rejection_reasons: [],
  },
};

export interface UseSalesDataResult {
  data: SalesData | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  reload: () => void;
}

export function useSalesData(): UseSalesDataResult {
  const [data, setData]         = useState<SalesData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    const merge = async (): Promise<SalesData> => {
      const [inv, sales] = await Promise.all([
        loadFixture<InventoryFixtureSlim>("inventory"),
        loadFixture<SalesFixtureSlim>("sales"),
      ]);
      return {
        customers:      sales.customers,
        paymentMethods: sales.payment_methods,
        etaSettings:    sales.eta_settings,
        items:          inv.items,
        taxTypes:       inv.tax_types,
        uoms:           inv.uoms,
        warehouses:     inv.warehouses,
        branches:       inv.branches,
        priceLists:     inv.price_lists,
        invoices:       sales.invoices,
        treasuries:     sales.treasuries,
        creditNotes:    sales.credit_notes,
        debitNotes:     sales.debit_notes,
        quotations:     sales.quotations,
        receipts:       sales.receipts,
        etaHub:         sales.eta_hub,
      };
    };

    try {
      const result = await mockFetch(merge, EMPTY);
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg === "mock_offline") {
        setIsOffline(true);
        try {
          const [inv, sales] = await Promise.all([
            loadFixture<InventoryFixtureSlim>("inventory"),
            loadFixture<SalesFixtureSlim>("sales"),
          ]);
          setData({
            customers:      sales.customers,
            paymentMethods: sales.payment_methods,
            etaSettings:    sales.eta_settings,
            items:          inv.items,
            taxTypes:       inv.tax_types,
            uoms:           inv.uoms,
            warehouses:     inv.warehouses,
            branches:       inv.branches,
            priceLists:     inv.price_lists,
            invoices:       sales.invoices,
            treasuries:     sales.treasuries,
            creditNotes:    sales.credit_notes,
            debitNotes:     sales.debit_notes,
            quotations:     sales.quotations,
            receipts:       sales.receipts,
            etaHub:         sales.eta_hub,
          });
        } catch {
          setData(EMPTY);
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, isOffline, reload: load };
}
