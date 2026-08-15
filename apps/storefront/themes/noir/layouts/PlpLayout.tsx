import { Suspense } from "react";
import type { PlpLayoutProps } from "@/lib/core/theme-contract";
import { ProductPriceIsland } from "@/lib/core/ProductPriceIsland";
import { Header } from "../components/Header";
import { FilterBar } from "../components/FilterBar";
import { ProductCard } from "../components/ProductCard";
import { ProductCardSkeleton } from "../components/ProductCardSkeleton";
import { Pagination } from "../components/Pagination";
import { Footer } from "../components/Footer";
import styles from "./PlpLayout.module.css";

const STORE_NAME = "متجر النيل";

export function PlpLayout({ categories, activeCategory, activeSort, result }: PlpLayoutProps) {
  const activeCategoryLabel = categories.find((c) => c.id === activeCategory)?.label_ar;

  return (
    <div className={styles.page}>
      <Header storeName={STORE_NAME} />

      <div className={styles.body}>
        <p className={styles.eyebrow}>{activeCategoryLabel ?? "كل المجموعات"}</p>

        <FilterBar categories={categories} activeCategory={activeCategory} activeSort={activeSort} />

        {result.isEmpty ? (
          <div className={styles.state}>
            <p>لا منتجات في هذا القسم بعد</p>
          </div>
        ) : result.isNoResults ? (
          <div className={styles.state}>
            <p>لا نتائج مطابقة لهذا الفلتر</p>
            <a href="/products" className={styles.clearLink}>امسح الفلاتر</a>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {result.mode === "streaming"
                ? result.staticProducts.map((p, i) => (
                    <Suspense key={p.id} fallback={<ProductCardSkeleton index={i} />}>
                      <ProductPriceIsland staticProduct={p} Card={ProductCard} cardProps={{ index: i }} />
                    </Suspense>
                  ))
                : result.products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              baseParams={{ category: activeCategory, sort: activeSort }}
            />
          </>
        )}
      </div>

      <Footer storeName={STORE_NAME} />
    </div>
  );
}
