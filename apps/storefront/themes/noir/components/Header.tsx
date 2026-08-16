import Link from "next/link";
import styles from "./Header.module.css";

export function Header({ storeName }: { storeName: string }) {
  return (
    <header className={styles.header}>
      <span className={styles.eyebrow}>NOIR EDIT</span>
      <Link href="/" className={styles.logo}>{storeName}</Link>
      <nav className={styles.nav}>
        <Link href="/products" className={styles.navLink}>مجموعات</Link>
        <span>·</span>
        <Link href="/track" className={styles.navLink}>تتبّع الطلب</Link>
        <span>·</span>
        <Link href="/account" className={styles.navLink}>حسابي</Link>
        <span>·</span>
        <Link href="/cart" className={styles.navLink}>السلة</Link>
      </nav>
    </header>
  );
}
