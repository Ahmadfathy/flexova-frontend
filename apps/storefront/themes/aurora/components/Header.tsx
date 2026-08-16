import Link from "next/link";
import styles from "./Header.module.css";

export function Header({ storeName }: { storeName: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>{storeName}</Link>
        <nav className={styles.nav}>
          <Link href="/products" className={styles.navLink}>المنتجات</Link>
          <Link href="/track" className={styles.navLink}>تتبّع الطلب</Link>
          <Link href="/account" className={styles.navLink}>حسابي</Link>
        </nav>
        <Link href="/cart" className={styles.cart} aria-label="السلة">🛍️</Link>
      </div>
    </header>
  );
}
