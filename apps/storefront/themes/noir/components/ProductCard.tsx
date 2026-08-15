import type { Product } from "@/lib/core/types";
import styles from "./ProductCard.module.css";

/** noir's editorial row — a stacked list item, not a grid card (spec §2 —
 * "fully different layout" from aurora's grid). */
export function ProductCard({ product, index }: { product: Product; index: number }) {
  const { dynamic } = product;
  const priceLabel =
    dynamic.erp_error ? "تأكّد من التوفّر" : dynamic.price != null ? `${dynamic.price} ج.م` : "—";
  const outOfStock = dynamic.in_stock === false;

  return (
    <article className={styles.row}>
      <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
      <div className={styles.imageBox} />
      <div className={styles.body}>
        <h3 className={styles.title}>{product.title_ar}</h3>
        {product.static_desc_ar && <p className={styles.desc}>{product.static_desc_ar}</p>}
        <div className={styles.meta}>
          <span className={styles.price}>{priceLabel}</span>
          {dynamic.offer && <span className={styles.offer}>عرض خاص</span>}
          {outOfStock && <span className={styles.oos}>غير متوفّر حالياً</span>}
        </div>
      </div>
    </article>
  );
}
