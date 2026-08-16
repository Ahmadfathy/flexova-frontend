/**
 * PDP add-to-cart gating (spec §4.3 "add-to-cart states") — Shared Core.
 *
 * Originally (S3) each theme's own `PriceAndCart` component computed this
 * independently — two copies of the exact same rule, a real violation of
 * golden rule #2 ("the theme is pure presentation — all business logic
 * lives in Shared Core"), caught during the module-gate review. Both
 * themes now call `getAddToCartGate` instead of reimplementing it.
 */
import type { ProductDynamic, ProductStatic, ProductVariant } from "./types";

/** "L/أزرق" style variant label — the one place this join rule is
 * defined, so both themes render identical labels. */
export function variantLabel(v: Pick<ProductVariant, "size" | "color">): string {
  return v.color ? `${v.size}/${v.color}` : (v.size ?? "");
}

export interface AddToCartGate {
  hasVariants: boolean;
  selectedVariant: ProductVariant | undefined;
  /** Never sells on missing/failed data (spec §4.4) — an ERP read failure
   * or a null price blocks add-to-cart exactly like a real 0-stock read. */
  priceUnknown: boolean;
  productOutOfStock: boolean;
  variantOutOfStock: boolean;
  variantRequired: boolean;
  canAddToCart: boolean;
}

export function getAddToCartGate(
  product: Pick<ProductStatic, "variants">,
  dynamic: ProductDynamic,
  selectedLabel: string | null
): AddToCartGate {
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const selectedVariant = product.variants?.find((v) => variantLabel(v) === selectedLabel);
  const priceUnknown = !!dynamic.erp_error || dynamic.price == null;
  const productOutOfStock = dynamic.in_stock === false;
  const variantOutOfStock = hasVariants && !!selectedVariant && selectedVariant.available <= 0;
  const variantRequired = hasVariants && !selectedLabel;

  return {
    hasVariants,
    selectedVariant,
    priceUnknown,
    productOutOfStock,
    variantOutOfStock,
    variantRequired,
    canAddToCart: !priceUnknown && !productOutOfStock && !variantRequired && !variantOutOfStock,
  };
}
