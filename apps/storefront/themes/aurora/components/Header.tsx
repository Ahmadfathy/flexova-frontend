import Link from "next/link";
import styles from "./Header.module.css";

export function Header({ storeName }: { storeName: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>{storeName}</Link>
        <nav className={styles.nav}>
          <Link href="/products" className={styles.navLink}>المنتجات</Link>
          <span className={styles.navLink}>تتبّع الطلب</span>
        </nav>
        <span className={styles.cart} aria-label="السلة">🛍️</span>
      </div>
    </header>
  );
}
