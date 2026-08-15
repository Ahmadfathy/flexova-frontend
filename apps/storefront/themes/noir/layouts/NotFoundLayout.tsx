import type { NotFoundLayoutProps } from "@/lib/core/theme-contract";
import { Header } from "../components/Header";
import { RelatedCard } from "../components/RelatedCard";
import { Footer } from "../components/Footer";
import styles from "./NotFoundLayout.module.css";

const STORE_NAME = "متجر النيل";

export function NotFoundLayout({ suggestions }: NotFoundLayoutProps) {
  return (
    <div className={styles.page}>
      <Header storeName={STORE_NAME} />
      <div className={styles.body}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>المنتج غير موجود</h1>
        <p className={styles.desc}>ربما تم إلغاء نشر هذا المنتج أو حذفه</p>
        <a href="/products" className={styles.catalogLink}>تصفّح كل المنتجات</a>

        {suggestions.length > 0 && (
          <section className={styles.suggestions}>
            <p className={styles.suggestionsLabel}>منتجات قد تعجبك</p>
            <div className={styles.grid}>
              {suggestions.map((p) => (
                <RelatedCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer storeName={STORE_NAME} />
    </div>
  );
}
