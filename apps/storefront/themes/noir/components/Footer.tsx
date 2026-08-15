import styles from "./Footer.module.css";

export function Footer({ storeName }: { storeName: string }) {
  return (
    <footer className={styles.footer}>
      <p className={styles.line}>{storeName} — © {new Date().getFullYear()}</p>
      <p className={styles.line}>سياسة الاسترجاع — الشحن — الخصوصية</p>
    </footer>
  );
}
