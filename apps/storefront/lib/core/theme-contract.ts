/**
 * The contract every theme package MUST satisfy (spec §2 Layer 2) — owned
 * by Shared Core, implemented by each `themes/<name>/index.ts`. A theme
 * changes presentation (layout/components/tokens.css) only; it receives
 * data and callbacks from Shared Core, never reaches into a fixture or the
 * mock BFF itself.
 *
 * Grows as later prompts add pages (PDP in S3 adds `ProductLayout`, cart in
 * S4 adds `CartLayout`, etc.) — each addition is implemented by both
 * `aurora` and `noir` at once, so the registry (`theme-registry.ts`) never
 * has to special-case a theme that's missing a piece.
 */
import type { ComponentType } from "react";
import type { Product, ProductStatic, Category, ShippingZone } from "./types";
import type { PlpResult } from "./catalog";

export interface ThemeConfig {
  name: "aurora" | "noir";
  label_ar: string;
  layout: string;
}

export interface HomeLayoutProps {
  storeName: string;
  featured: Product[];
  categories: Category[];
}

/** spec §5.2 — filter bar + grid + pagination. `result` carries either the
 * streaming static shell (per-card islands the theme wraps in Suspense) or
 * an already-resolved product list (price filter/sort's eager path) — see
 * `catalog.ts`'s `PlpResult`. */
export interface PlpLayoutProps {
  categories: Category[];
  activeCategory?: string;
  activeSort: "featured" | "price_asc" | "price_desc";
  result: PlpResult;
}

/** spec §4.2 — gallery + info block (title -> price island -> availability
 * island -> variant selector -> add to cart) + description + related. The
 * dynamic island itself is resolved inside the theme's own PdpLayout via
 * `ProductAvailabilityIsland` wrapped in `<Suspense>` — not passed as a
 * prop here, so the static shell can stream before it resolves. */
export interface PdpLayoutProps {
  product: ProductStatic;
  categoryLabel?: string;
  related: ProductStatic[];
}

/** spec §4.4 — true 404 (unpublished/deleted), themed, with suggestions +
 * catalog link. Rendered by `app/products/[slug]/not-found.tsx`. */
export interface NotFoundLayoutProps {
  suggestions: ProductStatic[];
}

/** spec §6 — client-only, not SEO. `catalog` is the full static product
 * list (title/image lookup by product_id) fetched once server-side so the
 * theme never needs its own fetch just to render a line item's title —
 * the live re-check itself (price/stock) is entirely the theme's own
 * concern via `useCartRecheck()`, called from inside the (Client
 * Component) CartLayout. */
export interface CartLayoutProps {
  catalog: ProductStatic[];
}

/** spec §7 — the whole guest-first checkout flow (delivery → shipping →
 * payment → review → confirm). `catalog` is for line-item titles the same
 * way `CartLayoutProps.catalog` is; `zones` is the static shipping-zone
 * list (§7 step 2). Everything *dynamic* about checkout — the reservation,
 * its TTL countdown, delivery form state, payment submission, every
 * critical state — comes from `useCheckout(zones)`, called inside the
 * theme's own CheckoutLayout exactly like CartLayout calls `useCartRecheck`. */
export interface CheckoutLayoutProps {
  catalog: ProductStatic[];
  zones: ShippingZone[];
}

export interface ThemeModule {
  config: ThemeConfig;
  HomeLayout: ComponentType<HomeLayoutProps>;
  PlpLayout: ComponentType<PlpLayoutProps>;
  PdpLayout: ComponentType<PdpLayoutProps>;
  NotFoundLayout: ComponentType<NotFoundLayoutProps>;
  CartLayout: ComponentType<CartLayoutProps>;
  CheckoutLayout: ComponentType<CheckoutLayoutProps>;
}
