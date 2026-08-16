import Link from "next/link";
import type { Product } from "@/lib/core/types";
import styles from "./ProductCard.module.css";

/** PLP grid card — links to the PDP (spec §5.2 "Product-card grid"). Fixes
 * a real gap caught live while verifying S5 (checkout): this card had no
 * `Link` at all, so a shopper could see the grid but never click into a
 * product — same slug convention `RelatedCard` already uses. */
export function ProductCard({ product }: { product: Product }) {
  const { dynamic } = product;
  const priceLabel =
    dynamic.erp_error ? "تأكّد من التوفّر" : dynamic.price != null ? `${dynamic.price} ج.م` : "—";
  const outOfStock = dynamic.in_stock === false;

  return (
    <Link href={`/products/${product.slug_en ?? product.id}`} className={styles.card}>
      <div className={styles.imageBox}>
        {dynamic.offer && <span className={styles.offerBadge}>عرض</span>}
        {outOfStock && <span className={styles.oosBadge}>غير متوفّر حالياً</span>}
      </div>
      <h3 className={styles.title}>{product.title_ar}</h3>
      <div className={styles.priceRow}>
        <span className={styles.price}>{priceLabel}</span>
        {dynamic.list_price && (
          <span className={styles.listPrice}>{dynamic.list_price} ج.م</span>
        )}
      </div>
    </Link>
  );
}
