import styles from "./ProductCard.module.css";
import skeletonStyles from "./ProductCardSkeleton.module.css";

/** Matches ProductCard's row shape — shown while that row's dynamic island
 * (price/availability) is still streaming in (spec §5.3). */
export function ProductCardSkeleton({ index }: { index: number }) {
  return (
    <article className={styles.row}>
      <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
      <div className={styles.imageBox} />
      <div>
        <div className={skeletonStyles.line} style={{ width: "60%", height: "1.1rem" }} />
        <div className={skeletonStyles.line} style={{ width: "35%" }} />
      </div>
    </article>
  );
}
