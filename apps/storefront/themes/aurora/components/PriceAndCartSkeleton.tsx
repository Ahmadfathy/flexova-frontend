import styles from "./PriceAndCartSkeleton.module.css";

/** Shown while `ProductAvailabilityIsland` resolves (spec §4.4 "small
 * skeleton on price/badge — page doesn't wait"). */
export function PriceAndCartSkeleton() {
  return (
    <div className={styles.block}>
      <div className={styles.line} style={{ width: "40%", height: "1.75rem" }} />
      <div className={styles.line} style={{ width: "60%" }} />
      <div className={styles.btn} />
    </div>
  );
}
