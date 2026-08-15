import type { Product } from "@/lib/core/types";
import styles from "./ProductCard.module.css";

export function ProductCard({ product }: { product: Product }) {
  const { dynamic } = product;
  const priceLabel =
    dynamic.erp_error ? "تأكّد من التوفّر" : dynamic.price != null ? `${dynamic.price} ج.م` : "—";
  const outOfStock = dynamic.in_stock === false;

  return (
    <article className={styles.card}>
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
    </article>
  );
}
