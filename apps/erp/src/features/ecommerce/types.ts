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
  title_en?: string;
  description_ar?: string;
  images: string[];
  seo: { meta_title_ar?: string; slug_ar?: string; slug_en?: string; og_image?: string };
  store_category: string;
  online_price: number | null;
  /** READ (FE_01) */
  erp_base_price: number;
  /** READ (FE_01) */
  erp_stock: number | null;
  publish_status: "published" | "draft" | "hidden";
  variants?: EcOnlineProductVariant[];
  /** READ (FE_01) — the linked inventory item's own ERP status. `"suspended"`
   * (or the item having been deleted, same effect) is spec §3.3's special
   * case: the product shows a warning and is auto-hidden from the
   * storefront regardless of its own `publish_status`. */
  erp_status?: "active" | "suspended";
  _flag?: string;
}

/** A picker-only shape (spec §3.2 "search + select existing inventory
 * item") — not a real join against `inventory.fixtures.json` (that
 * fixture's id namespace is a different, unrelated catalog — same
 * precedent `EcOrder`'s ERP READ fields already established). Scoped
 * mock data lives in `lib/mock/ecommerce.ts`, not the inventory fixture. */
export interface LinkableInventoryItem {
  id: string;
  name_ar: string;
  name_en: string;
  base_price: number;
  stock: number;
  status: "active" | "suspended";
  /** §3.7 bulk/auto-rule/mirror filter dimension — its own `invcat_*`
   * namespace, same "scoped mock pool" precedent as this whole type. */
  inventory_category_id: string;
}

/* ─────────────────────────────────────────────────────────────
   §3.7 Catalog modes (bulk / auto-rule / mirror)
   ───────────────────────────────────────────────────────────── */

export type CatalogMode = "manual" | "bulk" | "auto_rule" | "mirror";

/** A not-yet-published inventory item eligible for §3.7 Mode 2 (bulk
 * import). Combines the unlinked slice of `LinkableInventoryItem`'s pool
 * with the fixture's dedicated `catalog_modes_demo.bulk_candidates`. */
export interface EcBulkCandidate {
  inventory_item_id: string;
  name_ar: string;
  name_en?: string;
  erp_price: number;
  erp_stock: number;
  /** A `"suspended"` candidate is the bulk-publish partial-failure case —
   * it's listed (so search/filter behave normally) but publishing it
   * fails, same golden rule as the manual picker's suspended-item block. */
  status: "active" | "suspended";
  inventory_category_id: string;
}

/** §3.7 Mode 3 (auto-rule): "any new inventory item in category X →
 * auto-publish online". */
export interface EcCatalogRule {
  id: string;
  inventory_category_id: string;
  auto_publish: boolean;
  default_store_category: string;
}

/** §3.7 Mode 4 (mirror) pool row — every sellable inventory item, shown
 * by default unless a `mirror_exceptions` row hides it. `sellable: false`
 * (raw materials/samples) is excluded from the mirror by default, same as
 * spec §3.7 describes, but still listed here so the exceptions screen can
 * show *why* it's hidden instead of silently omitting it. */
export interface EcMirrorPoolItem {
  inventory_item_id: string;
  name_ar: string;
  name_en?: string;
  erp_price: number;
  erp_stock: number;
  inventory_category_id: string;
  status: "active" | "suspended";
  sellable: boolean;
}

export interface EcStoreCategory {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  seo_slug: string;
  _flag?: string;
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
  /** Mocked "payment posted in Accounting" stamp (spec §6.2/§6.4) — set by
   * `approvePayout()`, same convention as `EcOrder.credit_note_id`: a
   * deterministic mock reference id, visibly rendered, not a real
   * cross-module write (Finance/Accounting exposes no live mutate API to
   * write into — its own Payment Voucher form is toast-only, same mock
   * depth as everywhere else in this build). */
  posted_voucher_id?: string | null;
  _flag?: string;
}

export interface EcShippingZone {
  id: string;
  name_ar: string;
  cost: number;
}

/** spec §8 "Store data: name · logo · contact · social links · default
 * lang · RTL" + "Policies: shipping · returns · privacy (static content
 * pages)" — `contact`/`policies` aren't in the fixture (it only ever
 * seeded the theme-picker half of this screen), added here the same way
 * A2 added `erp_status` when the spec needed a field the fixture didn't
 * carry yet. */
export interface EcStoreConfig {
  store_name: string;
  logo: string;
  active_theme: string;
  available_themes: string[];
  /** §3.7/§8 — how inventory items become online products. Governance-
   * sensitive (`ecommerce.catalog.configure`), unlike `active_theme`
   * which is presentation-only and ungated. */
  catalog_mode: CatalogMode;
  payment_gateway: string[];
  default_lang: "ar" | "en";
  rtl: boolean;
  social: Record<string, string>;
  contact?: { phone?: string; email?: string };
  policies?: { shipping?: string; returns?: string; privacy?: string };
}

export type GatewayId = "paymob" | "fawry" | "cod";

/** §7 "abstraction layer: adding a gateway = adapter, not code change" —
 * modeled as data (a list of these configs the UI iterates), never a
 * bespoke component per gateway. `connected` is the mocked equivalent of
 * a live API connection check. */
export interface PaymentGatewayConfig {
  id: GatewayId;
  enabled: boolean;
  connected: boolean;
}
