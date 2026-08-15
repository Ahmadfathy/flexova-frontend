import styles from "./Header.module.css";

export function Header({ storeName }: { storeName: string }) {
  return (
    <header className={styles.header}>
      <span className={styles.eyebrow}>NOIR EDIT</span>
      <h1 className={styles.logo}>{storeName}</h1>
      <nav className={styles.nav}>
        <span>مجموعات</span>
        <span>·</span>
        <span>عن المتجر</span>
        <span>·</span>
        <span>تتبّع الطلب</span>
      </nav>
    </header>
  );
}
