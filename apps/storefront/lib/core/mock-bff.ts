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
import type { Product, ProductStatic, ProductDynamic, ProductVariant, Category, ThemeName, Cart, OnlineOrder } from "./types";

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

export async function getOrderTracking(code: string): Promise<OnlineOrder | undefined> {
  return fixtures.order_tracking.find((o) => o.code === code) as OnlineOrder | undefined;
}

export function getStoreMeta() {
  return fixtures._meta;
}
