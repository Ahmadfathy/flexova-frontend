import styles from "./Footer.module.css";

export function Footer({ storeName }: { storeName: string }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span>© {new Date().getFullYear()} {storeName}</span>
        <div className={styles.links}>
          <span>سياسة الاسترجاع</span>
          <span>الشحن</span>
          <span>الخصوصية</span>
        </div>
      </div>
    </footer>
  );
}
