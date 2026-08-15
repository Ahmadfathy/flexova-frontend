import styles from "./Hero.module.css";

export function Hero({ storeName }: { storeName: string }) {
  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>مرحبًا بك في {storeName}</h1>
      <p className={styles.subtitle}>تسوّق أحدث المنتجات بأسعار حصرية — توصيل سريع لجميع المحافظات</p>
      <span className={styles.cta}>تسوّق الآن</span>
    </section>
  );
}
