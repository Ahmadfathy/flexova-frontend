import Link from "next/link";
import type { ProductStatic } from "@/lib/core/types";
import { PlaceholderImage } from "./PlaceholderImage";
import styles from "./RelatedCard.module.css";

/** Related section is static/ISR (spec §4.2) — title/image only, no price.
 * Showing a price here would mean either faking a dynamic read or lying
 * about a "never sell on missing data" state that was never actually
 * checked, so it's deliberately left off; the PDP itself is one click away. */
export function RelatedCard({ product }: { product: ProductStatic }) {
  return (
    <Link href={`/products/${product.slug_en ?? product.id}`} className={styles.card}>
      <div className={styles.imageBox}>
        <PlaceholderImage alt={product.title_ar} />
      </div>
      <span className={styles.title}>{product.title_ar}</span>
    </Link>
  );
}
