/**
 * Catalog (PLP) — Shared Core logic (spec §5). Pure filter/sort/paginate
 * functions so both themes get identical behavior; only presentation
 * (`themes/<name>/layouts/PlpLayout.tsx`) differs.
 *
 * Governing rule (spec §5.1, §5.5 "filter/sort on static layer where
 * possible"): category filtering + pagination only need the STATIC half
 * of a product, so they run before any ERP price read — the page can
 * render instantly and stream each card's price/availability in
 * separately (see `ProductPriceIsland` below). Price-range/price-sort
 * are the one exception: they inherently need the dynamic (live) price,
 * so a query that uses them resolves every candidate's price eagerly
 * (`Promise.all`) up front instead of streaming — the page waits, but the
 * result is still correct and still never sells on stale data.
 */
import type { ProductStatic, Product, PlpQuery, SortOption } from "./types";
import { getProductDynamic } from "./mock-bff";

export const PLP_PAGE_SIZE = 8;

export function needsEagerPricing(query: Pick<PlpQuery, "sort" | "minPrice" | "maxPrice">): boolean {
  return query.sort !== "featured" || query.minPrice != null || query.maxPrice != null;
}

export function filterByCategory(items: ProductStatic[], category?: string): ProductStatic[] {
  if (!category) return items;
  return items.filter((p) => p.category === category);
}

export function paginate<T>(items: T[], page: number, pageSize = PLP_PAGE_SIZE) {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), totalCount, totalPages, page: safePage };
}

/** Only excludes a product when an actual price bound is requested — a
 * missing price ("ERP read fail", spec §4.4) still can't satisfy a
 * `minPrice`/`maxPrice` bound, since we don't know if it qualifies. With
 * no bound set (e.g. sorting only), the product stays and degrades
 * gracefully in the card UI instead of vanishing from the list. */
export function applyPriceFilter(items: Product[], minPrice?: number, maxPrice?: number): Product[] {
  if (minPrice == null && maxPrice == null) return items;
  return items.filter((p) => {
    if (p.dynamic.price == null) return false;
    if (minPrice != null && p.dynamic.price < minPrice) return false;
    if (maxPrice != null && p.dynamic.price > maxPrice) return false;
    return true;
  });
}

export function sortProducts(items: Product[], sort: SortOption): Product[] {
  if (sort === "featured") return items;
  // Missing prices always sort last, in either direction — never implied
  // to be the cheapest/priciest item just because the read failed.
  const withPrice = items.filter((p) => p.dynamic.price != null);
  const withoutPrice = items.filter((p) => p.dynamic.price == null);
  withPrice.sort((a, b) => {
    const pa = a.dynamic.price as number;
    const pb = b.dynamic.price as number;
    return sort === "price_asc" ? pa - pb : pb - pa;
  });
  return [...withPrice, ...withoutPrice];
}

/** Discriminated result the `/products` page composes and hands to the
 * active theme's `PlpLayout` — "streaming" is the fast path (static shell
 * instant, price/availability arrive per-card); "resolved" is the eager
 * path forced by a price-dependent filter/sort. */
export type PlpResult =
  | {
      mode: "streaming";
      staticProducts: ProductStatic[];
      totalCount: number;
      totalPages: number;
      page: number;
      isEmpty: boolean;
      isNoResults: boolean;
    }
  | {
      mode: "resolved";
      products: Product[];
      totalCount: number;
      totalPages: number;
      page: number;
      isEmpty: boolean;
      isNoResults: boolean;
    };

export async function resolvePlp(
  allStatic: ProductStatic[],
  query: PlpQuery,
  categoryHasAny: (categoryId: string) => boolean
): Promise<PlpResult> {
  const byCategory = filterByCategory(allStatic, query.category);

  // Empty (spec §5.3): a *category itself* has zero products anywhere in
  // the catalog — distinct from a filter simply matching nothing.
  const isEmpty = query.category != null && !categoryHasAny(query.category);

  if (!needsEagerPricing(query)) {
    const { items, totalCount, totalPages, page } = paginate(byCategory, query.page);
    return {
      mode: "streaming",
      staticProducts: items,
      totalCount,
      totalPages,
      page,
      isEmpty,
      isNoResults: !isEmpty && totalCount === 0,
    };
  }

  // Eager path: resolve every candidate's live price before filtering/sorting/paginating.
  const resolved = await Promise.all(
    byCategory.map(async (p) => ({ ...p, dynamic: await getProductDynamic(p.id) }))
  );
  const filtered = sortProducts(applyPriceFilter(resolved, query.minPrice, query.maxPrice), query.sort);
  const { items, totalCount, totalPages, page } = paginate(filtered, query.page);
  return {
    mode: "resolved",
    products: items,
    totalCount,
    totalPages,
    page,
    isEmpty,
    isNoResults: !isEmpty && totalCount === 0,
  };
}

export function parsePlpQuery(searchParams: Record<string, string | string[] | undefined>): PlpQuery {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const sortRaw = one(searchParams.sort);
  const sort: SortOption = sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "featured";
  const minPrice = one(searchParams.minPrice) ? Number(one(searchParams.minPrice)) : undefined;
  const maxPrice = one(searchParams.maxPrice) ? Number(one(searchParams.maxPrice)) : undefined;
  const page = one(searchParams.page) ? Math.max(1, Number(one(searchParams.page))) : 1;
  return { category: one(searchParams.category), sort, minPrice, maxPrice, page };
}
