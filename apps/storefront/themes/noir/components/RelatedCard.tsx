import Link from "next/link";
import type { ProductStatic } from "@/lib/core/types";
import styles from "./RelatedCard.module.css";

export function RelatedCard({ product }: { product: ProductStatic }) {
  return (
    <Link href={`/products/${product.slug_en ?? product.id}`} className={styles.card}>
      <div className={styles.imageBox} />
      <span className={styles.title}>{product.title_ar}</span>
    </Link>
  );
}
