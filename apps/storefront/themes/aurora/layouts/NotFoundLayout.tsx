import { PackageX } from "lucide-react";
import type { NotFoundLayoutProps } from "@/lib/core/theme-contract";
import { Header } from "../components/Header";
import { RelatedCard } from "../components/RelatedCard";
import { Footer } from "../components/Footer";
import styles from "./NotFoundLayout.module.css";

const STORE_NAME = "متجر النيل";

/** Themed true 404 (spec §4.4) — a real 404 HTTP status (this renders under
 * app/products/[slug]/not-found.tsx, triggered by notFound()), not a
 * "soft 404" that returns 200 with a not-found *message*. */
export function NotFoundLayout({ suggestions }: NotFoundLayoutProps) {
  return (
    <div className={styles.page}>
      <Header storeName={STORE_NAME} />
      <div className={styles.body}>
        <PackageX size={48} className={styles.icon} />
        <h1 className={styles.title}>المنتج غير موجود</h1>
        <p className={styles.desc}>ربما تم إلغاء نشر هذا المنتج أو حذفه</p>
        <a href="/products" className={styles.catalogLink}>تصفّح كل المنتجات</a>

        {suggestions.length > 0 && (
          <section className={styles.suggestions}>
            <h2 className={styles.suggestionsTitle}>منتجات قد تعجبك</h2>
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
