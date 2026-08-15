import styles from "./OfflineBanner.module.css";

export function OfflineBanner() {
  return (
    <div className={styles.banner}>
      لا يوجد اتصال — سلتك محفوظة محليًا، سيتم التحقق من الأسعار عند عودة الاتصال
    </div>
  );
}
