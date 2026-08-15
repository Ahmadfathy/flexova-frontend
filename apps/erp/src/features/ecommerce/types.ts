/**
 * FE_21 E-commerce Admin — display model (spec §2). Mirrors the
 * `ecommerce.fixtures.json` shapes 1:1. Cross-module ERP fields
 * (invoice_id, eta_status, payment_status, erp_stock, erp_base_price, ...)
 * are read straight off these entities — the fixture already carries them
 * inline (future API will do the same), so this mock layer never joins
 * against inventory/sales/accounting fixtures by id (their id namespaces
 * don't correspond — same precedent as Healthcare's InvoicesBalanceTab).
 */

export type EcOrderStatus =
  | "pending_payment" | "paid" | "processing" | "shipped" | "delivered" | "returned" | "cancelled";

export type EcPaymentMethod = "card" | "cod";
export type EcPaymentStatus = "pending" | "pending_cod" | "paid" | "refunded";
export type EcEtaStatus = "accepted" | "credit_note" | "rejected" | null;

/** Row-level offline indicator (mirrors Healthcare Today Board's per-row sync). */
export type SyncStatus = "synced" | "local" | "syncing";

export interface EcOrderItem {
  product_id: string;
  variant: string | null;
  qty: number;
  unit_price: number;
}

export interface EcOrder {
  id: string;
  code: string;
  customer_id: string;
  items: EcOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: EcOrderStatus;
  payment_method: EcPaymentMethod;
  payment_status: EcPaymentStatus;
  /** READ (FE_02) — invoice generated on order confirm. */
  invoice_id: string | null;
  /** READ (FE_02) — ETA e-receipt status. */
  eta_status: EcEtaStatus;
  affiliate_id: string | null;
  shipping_address?: string;
  carrier?: string | null;
  tracking_no?: string | null;
  created_at: string;
  /** Mocked "post credit note to Accounting/Sales" stamp — set by returnOrCancel(). */
  credit_note_id?: string | null;
  _flag?: string;
  /** Local row-level sync indicator (not persisted from the fixture). */
  sync?: SyncStatus;
}

export interface EcCustomer {
  id: string;
  name_ar: string;
  phone: string;
  source: "crm" | "guest";
  _note?: string;
}

export interface EcOnlineProductVariant {
  size?: string;
  color?: string;
  [key: string]: unknown;
}

export interface EcOnlineProduct {
  id: string;
  inventory_item_id: string;
  title_ar: string;
  title_en: string;
  description_ar?: string;
  images: string[];
  seo: { meta_title_ar?: string; slug_ar?: string; slug_en?: string; og_image?: string };
  store_category: string;
  online_price: number | null;
  /** READ (FE_01) */
  erp_base_price: number;
  /** READ (FE_01) */
  erp_stock: number;
  publish_status: "published" | "draft" | "hidden";
  variants?: EcOnlineProductVariant[];
}

export interface EcStoreCategory {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  seo_slug: string;
}

export interface EcAffiliate {
  id: string;
  name_ar: string;
  phone: string;
  code: string;
  link: string;
  commission_pct: number;
  clicks: number;
  attributed_orders: number;
  balance_due: number;
  status: "active" | "inactive";
}

export interface EcPayout {
  id: string;
  affiliate_id: string;
  amount: number;
  status: "pending_approval" | "approved" | "paid";
  requested_at: string;
  _flag?: string;
}

export interface EcShippingZone {
  id: string;
  name_ar: string;
  cost: number;
}

export interface EcStoreConfig {
  store_name: string;
  logo: string;
  active_theme: string;
  available_themes: string[];
  payment_gateway: string[];
  default_lang: "ar" | "en";
  rtl: boolean;
  social: Record<string, string>;
}
