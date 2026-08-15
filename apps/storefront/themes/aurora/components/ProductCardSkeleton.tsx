import styles from "./ProductCard.module.css";
import skeletonStyles from "./ProductCardSkeleton.module.css";

/** Matches ProductCard's box shape (spec §5.3 "per-card skeleton on price/badge") —
 * shown while that card's dynamic island (price/availability) is still streaming in. */
export function ProductCardSkeleton() {
  return (
    <article className={styles.card}>
      <div className={styles.imageBox} />
      <div className={skeletonStyles.line} style={{ width: "80%" }} />
      <div className={skeletonStyles.line} style={{ width: "40%" }} />
    </article>
  );
}
