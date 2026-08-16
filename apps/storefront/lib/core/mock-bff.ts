/**
 * Mock BFF — stand-in for the server-to-server ERP API (spec §1 "BFF").
 *
 * Every function here is `async` and shaped exactly like the real call will
 * be once the ERP backend exists (Flexova_FE_21_Ecommerce_Backend.md) — a
 * server-to-server read/write, never a direct DB or fixture touch from a
 * Client Component. Only Server Components / Server Actions import this
 * module. Swapping the body for a real `fetch()` to the ERP API later
 * should not require changing any call site.
 *
 * ERP is the source of truth (golden rule #1) — this file is the *only*
 * place that reads the storefront fixture; everything else goes through
 * the functions below.
 */
import "server-only";
import { unstable_cache } from "next/cache";
import fixturesJson from "@/lib/mock/fixtures/Flexova_FE_21_Ecommerce_Storefront_fixtures.json";
import type {
  Product,
  ProductStatic,
  ProductDynamic,
  ProductVariant,
  Category,
  ThemeName,
  Cart,
  OnlineOrder,
  Reservation,
  DeliveryInfo,
  PaymentMethod,
  ShippingZone,
  OrderConfirmation,
} from "./types";

/** Loosely-typed raw fixture shape (fields vary per demo row — offers/variants/
 * erp_error are each present on only some catalog entries) — normalized into
 * the strict `Product` contract by `toProduct` below. */
interface RawCatalogItem {
  id: string;
  slug_ar?: string;
  slug_en?: string;
  title_ar: string;
  images: string[];
  category: string;
  static_desc_ar?: string;
  seo: { meta_title_ar?: string; json_ld?: "Product" };
  variants?: ProductVariant[];
  _dynamic: {
    price: number | null;
    list_price?: number;
    available: number | null;
    in_stock: boolean | null;
    offer?: boolean;
    erp_error?: boolean;
  };
}

const fixtures = fixturesJson as unknown as {
  _meta: { active_theme: string };
  catalog: RawCatalogItem[];
  cart: Cart;
  order_tracking: OnlineOrder[];
};

function toProduct(raw: RawCatalogItem): Product {
  return {
    id: raw.id,
    slug_ar: raw.slug_ar,
    slug_en: raw.slug_en,
    title_ar: raw.title_ar,
    images: raw.images,
    category: raw.category,
    static_desc_ar: raw.static_desc_ar,
    seo: raw.seo,
    variants: raw.variants,
    dynamic: {
      price: raw._dynamic.price,
      list_price: raw._dynamic.list_price,
      available: raw._dynamic.available,
      in_stock: raw._dynamic.in_stock,
      offer: raw._dynamic.offer,
      erp_error: raw._dynamic.erp_error,
    },
  };
}

/** StoreConfig read (mocked) — `activeTheme` resolved **server-side**, spec §2.
 * An env override lets Phase-A prove the switch without an admin UI yet
 * (that's Admin Prompt A4's theme picker, which will write this same field). */
export async function getActiveTheme(): Promise<ThemeName> {
  const override = process.env.ACTIVE_THEME;
  if (override === "aurora" || override === "noir") return override;
  return fixtures._meta.active_theme as ThemeName;
}

export async function getCatalog(): Promise<Product[]> {
  return fixtures.catalog.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const all = await getCatalog();
  return all.find((p) => p.slug_en === slug || p.slug_ar === slug);
}

/** Static half only, by slug (spec §4.1 PDP shell) — clean AR/EN slug. */
export async function getProductStaticBySlug(slug: string): Promise<ProductStatic | undefined> {
  const all = await getCatalogStatic();
  return all.find((p) => p.slug_en === slug || p.slug_ar === slug);
}

/** "related" section (spec §4.2, static/ISR) — same category, self excluded. */
export async function getRelatedStatic(category: string, excludeId: string, limit = 4): Promise<ProductStatic[]> {
  const all = await getCatalogStatic();
  return all.filter((p) => p.category === category && p.id !== excludeId).slice(0, limit);
}

/** Static half only (spec §5.1) — instant, no ERP round trip. PLP renders
 * this immediately; each card's `dynamic` half streams in separately via
 * `getProductDynamic()` (see `catalog.ts`'s per-card island). */
export async function getCatalogStatic(): Promise<ProductStatic[]> {
  return fixtures.catalog.map(({ _dynamic: _omit, ...rest }) => rest);
}

/** Simulates the live per-product ERP stock+price read (spec §5.1 "dynamic
 * per-card island"). Real latency + a small random jitter so, in dev,
 * cards visibly resolve independently instead of all at once. */
export async function getProductDynamic(id: string): Promise<ProductDynamic> {
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 500));
  const raw = fixtures.catalog.find((p) => p.id === id);
  if (!raw) return { price: null, available: null, in_stock: null, erp_error: true };
  return {
    price: raw._dynamic.price,
    list_price: raw._dynamic.list_price,
    available: raw._dynamic.available,
    in_stock: raw._dynamic.in_stock,
    offer: raw._dynamic.offer,
    erp_error: raw._dynamic.erp_error,
  };
}

/**
 * PDP's dynamic read (spec §4.1) — same live price/stock as
 * `getProductDynamic`, but wrapped in Next's Data Cache with a per-product
 * tag. Unlike PLP's per-card islands (which re-read on every request to
 * make independent streaming visible in dev), a Product page is meant to
 * be genuinely ISR'd: `unstable_cache` lets `generateStaticParams` +
 * static rendering work for the shell while still being instantly
 * invalidatable — the *same* mechanism §10's "product changed in admin →
 * revalidateTag via Redis → all instances update" describes, and the
 * exact reason apps/storefront's custom Redis cache handler
 * (lib/cache/redis-handler.mjs, Phase A) exists. A real ERP webhook would
 * call `revalidateTag(`product:${id}`)` on price/stock change; nothing
 * else here would need to change.
 */
export async function getProductDynamicCached(id: string): Promise<ProductDynamic> {
  return unstable_cache(() => getProductDynamic(id), ["product-dynamic", id], {
    tags: [`product:${id}`],
    revalidate: 60,
  })();
}

/** StoreCategory read (mocked) — spec §3. The storefront fixture only
 * carries a bare `category` id per product (no separate categories
 * collection), so labels are a small local map; `isEmpty` is derived live
 * from the catalog, matching `_states_demo.catalog_empty_category`. */
const CATEGORY_LABELS: Record<string, string> = {
  cat_men: "رجالي",
  cat_women: "حريمي",
  cat_shoes: "أحذية",
  cat_accessories: "إكسسوارات",
};

export async function getCategories(): Promise<Category[]> {
  const catalog = await getCatalog();
  return Object.entries(CATEGORY_LABELS).map(([id, label_ar]) => ({
    id,
    label_ar,
    isEmpty: !catalog.some((p) => p.category === id),
  }));
}

export async function getCart(): Promise<Cart> {
  return { items: fixtures.cart.items, subtotal: fixtures.cart.subtotal };
}

/** Orders placed for real through S5's `confirmOrder` (spec §8 "reads
 * OnlineOrder status") — populated below, checked before the static fixture
 * demo rows so a shopper can actually track the order they just placed,
 * not just the 3 canned demo codes. */
const liveOrders = new Map<string, OnlineOrder>();

export async function getOrderTracking(code: string): Promise<OnlineOrder | undefined> {
  return liveOrders.get(code) ?? (fixtures.order_tracking.find((o) => o.code === code) as OnlineOrder | undefined);
}

export function getStoreMeta() {
  return fixtures._meta;
}

/* -------------------------------------------------------------------- */
/* Checkout (spec §7) — reservation, customer match, payment, confirm.  */
/* Module-level `Map`s stand in for the ERP's own reservation/order      */
/* tables (mock only — a real backend persists these server-side, same   */
/* trust boundary as everything else in this file: never touched by a   */
/* theme or Client Component directly, only via checkout-actions.ts).   */
/* -------------------------------------------------------------------- */

const reservations = new Map<string, Reservation>();
/** Idempotency store (spec §7 "double-submit = one order") — keyed by the
 * client-generated idempotency key, kept for the process lifetime. */
const idempotentOrders = new Map<string, OrderConfirmation>();
let reservationSeq = 9100; // fixture's demo reservation is resv_9001
let orderSeq = 5100; // fixture's demo tracking codes are EC-5001/5002

const SHIPPING_ZONES: ShippingZone[] = [
  { id: "z_cairo", label_ar: "القاهرة والجيزة", cost: 50 },
  { id: "z_alex", label_ar: "الإسكندرية", cost: 60 },
  { id: "z_other", label_ar: "باقي المحافظات", cost: 90 },
];

/** Basic v1 shipping (spec §7 step 2 "shipping method/zone + cost (v1
 * basic)") — flat per-zone cost, no carrier/weight rules. */
export async function getShippingZones(): Promise<ShippingZone[]> {
  return SHIPPING_ZONES;
}

async function readAvailable(productId: string): Promise<number> {
  const dyn = await getProductDynamic(productId);
  return dyn.available ?? 0;
}

/**
 * Start checkout → StockReservation (spec §7 "immediately, TTL, visible
 * countdown"). Requested qty is clamped to whatever's actually available
 * right now; the caller compares the returned qty against what it asked
 * for to know whether to show the "instant adjust" alert. `ttlSecondsOverride`
 * only exists so a live demo can prove the TTL-expiry flow without a
 * 10-minute wait (never used by the real flow — see checkout-actions.ts).
 */
export async function createReservation(
  items: { product_id: string; variant: string | null; qty: number }[],
  ttlSecondsOverride?: number
): Promise<Reservation> {
  const resolved = await Promise.all(
    items.map(async (it) => ({ ...it, qty: Math.max(0, Math.min(it.qty, await readAvailable(it.product_id))) }))
  );
  const id = `resv_${reservationSeq++}`;
  const ttl_seconds = ttlSecondsOverride ?? 600;
  const reservation: Reservation = {
    id,
    items: resolved.filter((it) => it.qty > 0),
    ttl_seconds,
    expires_at: new Date(Date.now() + ttl_seconds * 1000).toISOString(),
    status: "active",
  };
  reservations.set(id, reservation);
  return reservation;
}

/** Lazily flips active→expired the moment `expires_at` has passed — every
 * read is the check, no background timer needed on this side (the client
 * runs its own visible countdown; this is the source of truth it defers to). */
export async function getReservation(id: string): Promise<Reservation | undefined> {
  const r = reservations.get(id);
  if (!r) return undefined;
  if (r.status === "active" && new Date(r.expires_at).getTime() <= Date.now()) {
    r.status = "expired";
  }
  return r;
}

export async function releaseReservation(id: string): Promise<void> {
  const r = reservations.get(id);
  if (r && r.status === "active") r.status = "released";
}

/** CRM customer match by phone (spec §7 step 1 "phone in CRM → linked;
 * else implicit CRM customer"). One hardcoded demo phone plays the "already
 * a customer" branch; every other phone becomes a fresh implicit customer —
 * matches the fixture's own `checkout.delivery` demo (`crm_match: false`). */
const KNOWN_CRM_PHONES = new Set(["01022223333"]);

export async function matchCrmCustomer(phone: string): Promise<{ crm_match: boolean }> {
  await new Promise((r) => setTimeout(r, 200));
  return { crm_match: KNOWN_CRM_PHONES.has(phone) };
}

/** Simulated payment gateway round trip (spec §7 step 3). COD never talks
 * to a gateway at all — it "pays" instantly by definition. `forceMock` lets
 * a live demo reach the `payment_failed` / `webhook_late` critical states
 * on demand (`?mock=payment_fail` / `?mock=webhook_late`, checkout-actions.ts). */
export type PaymentOutcome = "paid" | "failed" | "pending";

export async function processPayment(method: PaymentMethod, forceMock?: string | null): Promise<PaymentOutcome> {
  if (method === "cod") return "paid";
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));
  if (forceMock === "payment_fail") return "failed";
  if (forceMock === "webhook_late") return "pending";
  return "paid";
}

const KNOWN_AFFILIATES: Record<string, string> = { MONA10: "aff_mona" };

async function resolveAffiliate(refCode: string | null): Promise<string | null> {
  if (!refCode) return null;
  return KNOWN_AFFILIATES[refCode] ?? null;
}

export interface ConfirmOrderInput {
  idempotencyKey: string;
  reservationId: string;
  delivery: DeliveryInfo;
  paymentMethod: PaymentMethod;
  outcome: PaymentOutcome;
  refCode: string | null;
  /** `?mock=race_out` — forces the "item out at confirm" guard below to
   * trip even though nothing in the fixture actually changed, so the race
   * UI can be demoed live without a second browser tab racing a real change. */
  forceRaceOut?: boolean;
}

export type ConfirmOrderResult =
  | { ok: true; order: OrderConfirmation }
  | { ok: false; reason: "race_out" | "reservation_expired"; blockedItems: { product_id: string; variant: string | null }[] };

/**
 * Confirm → invoice+ETA (spec §7 step 4 + §10). Three guards run in order:
 * idempotency (a repeat call with the same key returns the *same* order,
 * never a second one), reservation liveness, and the race-out-at-confirm
 * stock re-check (the reservation is the anti-oversell guard — this is it
 * actually being enforced, not just held). Only once all three pass does
 * an OnlineOrder + invoice get created.
 */
export async function confirmOrder(input: ConfirmOrderInput): Promise<ConfirmOrderResult> {
  const cached = idempotentOrders.get(input.idempotencyKey);
  if (cached) return { ok: true, order: cached };

  const reservation = await getReservation(input.reservationId);
  if (!reservation || reservation.status === "expired") {
    return { ok: false, reason: "reservation_expired", blockedItems: [] };
  }

  const blockedItems: { product_id: string; variant: string | null }[] = [];
  for (const it of reservation.items) {
    const stillAvailable = input.forceRaceOut ? 0 : await readAvailable(it.product_id);
    if (stillAvailable < it.qty) blockedItems.push({ product_id: it.product_id, variant: it.variant });
  }
  if (blockedItems.length > 0) {
    return { ok: false, reason: "race_out", blockedItems };
  }

  reservation.status = "committed";

  const code = `EC-${orderSeq++}`;
  const status: OrderConfirmation["status"] =
    input.outcome === "pending" ? "pending_payment" : input.paymentMethod === "cod" ? "processing" : "confirmed";
  const order: OrderConfirmation = {
    code,
    status,
    invoice_id: input.outcome === "pending" ? null : `inv_${code}`,
    attributed_affiliate: status === "pending_payment" ? null : await resolveAffiliate(input.refCode),
  };
  idempotentOrders.set(input.idempotencyKey, order);
  liveOrders.set(code, { code, status, timeline: timelineForStatus(status), carrier: null, tracking_no: null });
  return { ok: true, order };
}

/** §8's timeline vocabulary is confirmed→processing→shipped→delivered — a
 * freshly-placed order has only reached whichever of those its own status
 * already implies (a COD order skips straight past a bare "confirmed" the
 * same way spec §7 describes it: "confirm → processing"). `pending_payment`
 * isn't part of that vocabulary at all (no invoice/commitment yet), so it
 * gets no timeline — §8's tracking page treats that the same as "nothing
 * confirmed yet", not a stage of its own. */
function timelineForStatus(status: OrderConfirmation["status"]): string[] {
  const stages = ["confirmed", "processing", "shipped", "delivered"];
  const idx = stages.indexOf(status);
  return idx === -1 ? [] : stages.slice(0, idx + 1);
}
