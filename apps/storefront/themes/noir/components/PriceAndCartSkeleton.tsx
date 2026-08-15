import styles from "./PriceAndCartSkeleton.module.css";

export function PriceAndCartSkeleton() {
  return (
    <div className={styles.block}>
      <div className={styles.line} style={{ width: "35%", height: "1.5rem" }} />
      <div className={styles.line} style={{ width: "50%" }} />
      <div className={styles.btn} />
    </div>
  );
}
