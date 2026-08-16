/**
 * Shared Core — data contracts (spec §2, §3).
 *
 * Every theme consumes these types and nothing else for data shape — a
 * theme MUST NOT redefine or widen them. Mirrors the entities table in
 * §3 of the Storefront spec 1:1, and the mock BFF's fixture shapes.
 */

export type ThemeName = "aurora" | "noir";

export interface ProductVariant {
  size?: string;
  color?: string;
  available: number;
}

export interface ProductSeo {
  meta_title_ar?: string;
  json_ld?: "Product";
}

/** OnlineProduct (§3) — static fields (ISR) + `_dynamic` (live ERP read, §4.1). */
export interface Product {
  id: string;
  slug_ar?: string;
  slug_en?: string;
  title_ar: string;
  images: string[];
  category: string;
  static_desc_ar?: string;
  seo: ProductSeo;
  variants?: ProductVariant[];
  /** READ (FE_01/pricing) — live stock+price. `null` fields mean the ERP
   * read failed (spec §4.4 "ERP read fail" — never render a broken number). */
  dynamic: ProductDynamic;
}

export interface ProductDynamic {
  price: number | null;
  list_price?: number;
  available: number | null;
  in_stock: boolean | null;
  offer?: boolean;
  /** True when the live ERP read itself failed (distinct from a legitimate 0-stock read). */
  erp_error?: boolean;
}

/** The static half of `Product` (title/images/slug/SEO/category) — everything
 * PLP/PDP can render instantly from ISR without an ERP round trip (spec §4.1,
 * §5.1). `getCatalogStatic()` returns exactly this shape; the `dynamic` field
 * is resolved separately, per-product, as its own "island" (see `catalog.ts`). */
export type ProductStatic = Omit<Product, "dynamic">;

export interface Category {
  id: string;
  label_ar: string;
  /** True when this category currently has zero products anywhere in the
   * catalog — drives PLP's empty-vs-no-results distinction (spec §5.3). */
  isEmpty: boolean;
}

export type SortOption = "featured" | "price_asc" | "price_desc";

/** PLP query state, parsed from `?category=&sort=&minPrice=&maxPrice=&page=`
 * (spec §5.2 filter bar + §5.2 "indexable `?page=` links"). */
export interface PlpQuery {
  category?: string;
  sort: SortOption;
  minPrice?: number;
  maxPrice?: number;
  page: number;
}

export interface CartItem {
  product_id: string;
  variant: string | null;
  qty: number;
  /** Price snapshotted when the item was added. */
  price_at_add: number;
  /** Live price as of the last re-check (spec §6 — "live re-check on open"). */
  live_price: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
}

export type ReservationStatus = "active" | "expired" | "committed" | "released";

/** StockReservation (§3, §7) — anti-oversell TTL guard, created at checkout start. */
export interface Reservation {
  id: string;
  items: { product_id: string; variant: string | null; qty: number }[];
  ttl_seconds: number;
  expires_at: string;
  status: ReservationStatus;
}

export interface DeliveryInfo {
  phone: string;
  name: string;
  address: string;
  zone?: string;
  shipping_cost?: number;
  /** Whether the phone matched an existing CRM customer (spec §7 step 1). */
  crm_match: boolean;
}

export type PaymentMethod = "paymob" | "fawry" | "cod";

export interface Attribution {
  ref_code: string;
  affiliate_id: string;
  source: "cookie" | "code";
}

/** Shipping zone (§7 step 2 "shipping method/zone + cost (v1 basic)") — a
 * flat per-zone cost, no carrier/weight rules yet (out of v1 scope). */
export interface ShippingZone {
  id: string;
  label_ar: string;
  cost: number;
}

export type CheckoutStep = "delivery" | "shipping" | "payment" | "review" | "confirmed";

/** What `useCheckout` gets back once `confirmOrder` actually creates the
 * bridge OnlineOrder row (§7 "confirm → ... → invoice+ETA generated"). Not
 * the same shape as `OnlineOrder` (tracking, §8) — this is the receipt the
 * checkout flow itself renders. */
export interface OrderConfirmation {
  code: string;
  status: OnlineOrderStatus;
  /** `null` when no invoice exists yet (§7 "no invoice before payment
   * confirmed" — the `webhook_late` critical state). */
  invoice_id: string | null;
  /** Set only when the order is both attributed (ref cookie/code present)
   * and actually confirmed — §10 "confirmed + attributed order → affiliate
   * commission (confirmed only)", never on a merely-pending order. */
  attributed_affiliate: string | null;
}

export type OnlineOrderStatus = "pending_payment" | "processing" | "confirmed" | "shipped" | "delivered";

export interface OnlineOrder {
  code: string;
  status: OnlineOrderStatus | null;
  timeline: string[];
  carrier?: string | null;
  tracking_no?: string | null;
}
