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
        <span className={styles.navLink}>تتبّع الطلب</span>
      </nav>
    </header>
  );
}
