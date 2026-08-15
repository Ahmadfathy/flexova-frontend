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
import fixturesJson from "@/lib/mock/fixtures/Flexova_FE_21_Ecommerce_Storefront_fixtures.json";
import type { Product, ProductVariant, ThemeName, Cart, OnlineOrder } from "./types";

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

export async function getCart(): Promise<Cart> {
  return { items: fixtures.cart.items, subtotal: fixtures.cart.subtotal };
}

export async function getOrderTracking(code: string): Promise<OnlineOrder | undefined> {
  return fixtures.order_tracking.find((o) => o.code === code) as OnlineOrder | undefined;
}

export function getStoreMeta() {
  return fixtures._meta;
}
