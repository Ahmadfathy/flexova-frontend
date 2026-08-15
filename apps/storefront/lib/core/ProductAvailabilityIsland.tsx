import type { ComponentType } from "react";
import { getProductDynamicCached } from "./mock-bff";
import type { ProductDynamic } from "./types";

interface ProductAvailabilityIslandProps<TExtra extends object> {
  productId: string;
  /** The active theme's price/availability/variant-selector/add-to-cart
   * block — a Client Component (variant selection + "add to cart" are
   * interactive, spec §4.1). Shared Core only supplies the resolved data. */
  Render: ComponentType<{ dynamic: ProductDynamic } & TExtra>;
  renderProps?: TExtra;
}

/** PDP's dynamic island (spec §4.1/§4.4 "page doesn't wait") — a theme
 * wraps this in `<Suspense fallback={<PriceSkeleton/>}>` so the static
 * shell (gallery/title/description) streams immediately while this
 * resolves. Backed by `getProductDynamicCached` (ISR + tag invalidation),
 * so after the first request it typically resolves near-instantly from
 * cache rather than paying the mocked latency every time. */
export async function ProductAvailabilityIsland<TExtra extends object = Record<string, never>>({
  productId,
  Render,
  renderProps,
}: ProductAvailabilityIslandProps<TExtra>) {
  const dynamic = await getProductDynamicCached(productId);
  const props = { dynamic, ...(renderProps ?? ({} as TExtra)) };
  return <Render {...props} />;
}
