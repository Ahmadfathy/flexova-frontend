import type { ComponentType } from "react";
import { getProductDynamic } from "./mock-bff";
import type { Product, ProductStatic } from "./types";

interface ProductPriceIslandProps<TExtra extends object> {
  staticProduct: ProductStatic;
  /** The active theme's own ProductCard — Shared Core only fetches data and
   * hands it off; it never decides how a card looks. */
  Card: ComponentType<{ product: Product } & TExtra>;
  /** Extra presentation-only props a theme's card needs (e.g. noir's row
   * `index`) — known synchronously, just forwarded through unchanged. */
  cardProps?: TExtra;
}

/** The "dynamic per-card island" itself (spec §5.1/§5.2) — an async Server
 * Component a theme wraps in `<Suspense fallback={<CardSkeleton/>}>` per
 * product. React/Next stream each one in independently as its (mocked)
 * ERP price/availability read resolves, instead of the whole grid waiting
 * on the slowest card. Shared Core owns this; themes only supply the
 * skeleton and the `Card` renderer. */
export async function ProductPriceIsland<TExtra extends object = Record<string, never>>({
  staticProduct,
  Card,
  cardProps,
}: ProductPriceIslandProps<TExtra>) {
  const dynamic = await getProductDynamic(staticProduct.id);
  const props = { product: { ...staticProduct, dynamic }, ...(cardProps ?? ({} as TExtra)) };
  return <Card {...props} />;
}
