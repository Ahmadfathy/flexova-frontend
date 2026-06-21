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

// ── Sales-sourced types ──────────────────────────────────────────

export interface Treasury {
  id: string;
  name_ar: string;
  name_en: string;
  type: string;
}

export interface PaymentMethod {
  id: string;
  name_ar: string;
  name_en: string;
  type: string;
}

// ── Purchasing types ─────────────────────────────────────────────

export interface PaymentTerms {
  type: "cash" | "credit";
  days?: number;
  credit_limit?: number;
}

export interface Supplier {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  trn: string;
  uin: string;
  payment_terms: PaymentTerms;
  category: "local" | "imported";
  contact: { phone: string; email: string; address: string };
  status: "active" | "suspended";
  balance: number;
  _flag?: string;
}

export interface PurchaseInvoiceLine {
  item_id: string;
  qty: number;
  uom_id: string;
  purchase_price: number;
  line_discount: number;
  tax_type_id: string;
  line_total: number;
}

export type ReceiptStatus = "pending" | "partially_received" | "completed";
export type PurchasePaymentStatus = "paid" | "partial" | "credit";
export type InboundEtaStatus = "pending" | "accepted" | "rejected" | "unmatched";

export interface PurchaseInvoice {
  id: string;
  number: string;
  date: string;
  supplier_id: string;
  supplier_invoice_no: string;
  warehouse_id: string;
  payment_method: string;
  mode: "direct" | "advanced";
  receipt_status: ReceiptStatus;
  payment_status: PurchasePaymentStatus;
  inbound_eta_status: InboundEtaStatus;
  inbound_eta_uuid: string | null;
  lines: PurchaseInvoiceLine[];
  additional_costs: number;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    additional_costs: number;
    grand_total: number;
  };
  paid: number;
  balance: number;
}

export interface PurchaseOrderLine {
  item_id: string;
  qty_ordered: number;
  qty_received: number;
  uom_id: string;
  price: number;
  line_total: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  date: string;
  supplier_id: string;
  expected_delivery: string;
  warehouse_id: string;
  status: string;
  from?: string;
  lines: PurchaseOrderLine[];
  totals: { subtotal: number; tax: number; grand_total: number };
}

export interface GoodsReceiptLine {
  item_id: string;
  qty_received: number;
  uom_id: string;
}

export interface GoodsReceipt {
  id: string;
  number: string;
  po_id: string;
  date: string;
  warehouse_id: string;
  lines: GoodsReceiptLine[];
}

export interface PurchaseReturnLine {
  item_id: string;
  qty: number;
  uom_id: string;
  price: number;
  line_total: number;
}

export interface PurchaseReturn {
  id: string;
  number: string;
  source_invoice: string;
  date: string;
  supplier_id: string;
  reason_ar: string;
  reason_en: string;
  lines: PurchaseReturnLine[];
  totals: { value: number };
}

export interface PaymentVoucher {
  id: string;
  number: string;
  date: string;
  supplier_id: string;
  invoice_id: string;
  amount: number;
  method: string;
  treasury_id: string;
}

export interface InboundEta {
  id: string;
  uuid: string;
  supplier_id: string;
  supplier_name_ar: string;
  value: number;
  tax: number;
  status: InboundEtaStatus;
  received_at: string;
  window_deadline?: string;
  window_remaining_hours?: number;
  matched_pi: string | null;
  reason_ar?: string;
  reason_en?: string;
  _flag?: string;
}

export interface InboundEtaKpis {
  deductible_input_vat: number;
  nearing_window: number;
  pending: number;
  rejected: number;
}

// ── Fixture shapes ───────────────────────────────────────────────

interface InventoryFixtureSlim {
  items: InventoryItem[];
  tax_types: TaxType[];
  uoms: UOM[];
  warehouses: Warehouse[];
  branches: Branch[];
}

interface SalesFixtureSlim {
  treasuries: Treasury[];
  payment_methods: PaymentMethod[];
}

interface PurchasingFixture {
  _meta: { mode: "direct" | "advanced" };
  suppliers: Supplier[];
  purchase_invoices: PurchaseInvoice[];
  purchase_orders: PurchaseOrder[];
  goods_receipts: GoodsReceipt[];
  purchase_returns: PurchaseReturn[];
  payment_vouchers: PaymentVoucher[];
  inbound_eta: InboundEta[];
  inbound_eta_kpis: InboundEtaKpis;
}

// ── Merged data shape ────────────────────────────────────────────

export interface PurchasingData {
  mode: "direct" | "advanced";
  items: InventoryItem[];
  taxTypes: TaxType[];
  uoms: UOM[];
  warehouses: Warehouse[];
  branches: Branch[];
  treasuries: Treasury[];
  paymentMethods: PaymentMethod[];
  suppliers: Supplier[];
  purchaseInvoices: PurchaseInvoice[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  purchaseReturns: PurchaseReturn[];
  paymentVouchers: PaymentVoucher[];
  inboundEta: InboundEta[];
  inboundEtaKpis: InboundEtaKpis;
}

const EMPTY: PurchasingData = {
  mode: "direct",
  items: [], taxTypes: [], uoms: [], warehouses: [], branches: [],
  treasuries: [], paymentMethods: [],
  suppliers: [], purchaseInvoices: [], purchaseOrders: [],
  goodsReceipts: [], purchaseReturns: [], paymentVouchers: [],
  inboundEta: [],
  inboundEtaKpis: { deductible_input_vat: 0, nearing_window: 0, pending: 0, rejected: 0 },
};

// ── Hook ─────────────────────────────────────────────────────────

export interface UsePurchasingDataResult {
  data: PurchasingData | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  reload: () => void;
}

export function usePurchasingData(): UsePurchasingDataResult {
  const [data, setData]           = useState<PurchasingData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    const merge = async (): Promise<PurchasingData> => {
      const [inv, sales, pur] = await Promise.all([
        loadFixture<InventoryFixtureSlim>("inventory"),
        loadFixture<SalesFixtureSlim>("sales"),
        loadFixture<PurchasingFixture>("purchasing"),
      ]);
      return {
        mode:             pur._meta.mode,
        items:            inv.items,
        taxTypes:         inv.tax_types,
        uoms:             inv.uoms,
        warehouses:       inv.warehouses,
        branches:         inv.branches,
        treasuries:       sales.treasuries,
        paymentMethods:   sales.payment_methods,
        suppliers:        pur.suppliers,
        purchaseInvoices: pur.purchase_invoices,
        purchaseOrders:   pur.purchase_orders,
        goodsReceipts:    pur.goods_receipts,
        purchaseReturns:  pur.purchase_returns,
        paymentVouchers:  pur.payment_vouchers,
        inboundEta:       pur.inbound_eta,
        inboundEtaKpis:   pur.inbound_eta_kpis,
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
          const [inv, sales, pur] = await Promise.all([
            loadFixture<InventoryFixtureSlim>("inventory"),
            loadFixture<SalesFixtureSlim>("sales"),
            loadFixture<PurchasingFixture>("purchasing"),
          ]);
          setData({
            mode:             pur._meta.mode,
            items:            inv.items,
            taxTypes:         inv.tax_types,
            uoms:             inv.uoms,
            warehouses:       inv.warehouses,
            branches:         inv.branches,
            treasuries:       sales.treasuries,
            paymentMethods:   sales.payment_methods,
            suppliers:        pur.suppliers,
            purchaseInvoices: pur.purchase_invoices,
            purchaseOrders:   pur.purchase_orders,
            goodsReceipts:    pur.goods_receipts,
            purchaseReturns:  pur.purchase_returns,
            paymentVouchers:  pur.payment_vouchers,
            inboundEta:       pur.inbound_eta,
            inboundEtaKpis:   pur.inbound_eta_kpis,
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
