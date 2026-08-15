import styles from "./Header.module.css";

export function Header({ storeName }: { storeName: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.logo}>{storeName}</span>
        <nav className={styles.nav}>
          <span className={styles.navLink}>المنتجات</span>
          <span className={styles.navLink}>العروض</span>
          <span className={styles.navLink}>تتبّع الطلب</span>
        </nav>
        <span className={styles.cart} aria-label="السلة">🛍️</span>
      </div>
    </header>
  );
}
