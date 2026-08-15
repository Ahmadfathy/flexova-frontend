import { Suspense } from "react";
import type { PdpLayoutProps } from "@/lib/core/theme-contract";
import { ProductAvailabilityIsland } from "@/lib/core/ProductAvailabilityIsland";
import { Header } from "../components/Header";
import { Gallery } from "../components/Gallery";
import { PriceAndCart } from "../components/PriceAndCart";
import { PriceAndCartSkeleton } from "../components/PriceAndCartSkeleton";
import { RelatedCard } from "../components/RelatedCard";
import { Footer } from "../components/Footer";
import styles from "./PdpLayout.module.css";

const STORE_NAME = "متجر النيل";

/** spec §4.2 layout: gallery (static) · info block: title (static) -> price
 * island -> availability island -> variant selector -> add to cart ·
 * description (static) · related (static). */
export function PdpLayout({ product, categoryLabel, related }: PdpLayoutProps) {
  return (
    <div className={styles.page}>
      <Header storeName={STORE_NAME} />

      <div className={styles.body}>
        <nav className={styles.breadcrumb} aria-label="breadcrumb">
          <a href="/">الرئيسية</a> /{" "}
          {categoryLabel ? (
            <>
              <a href={`/products?category=${product.category}`}>{categoryLabel}</a> /{" "}
            </>
          ) : null}
          <span>{product.title_ar}</span>
        </nav>

        <div className={styles.grid}>
          <Gallery images={product.images} title={product.title_ar} />

          <div className={styles.info}>
            <h1 className={styles.title}>{product.title_ar}</h1>

            <Suspense fallback={<PriceAndCartSkeleton />}>
              <ProductAvailabilityIsland productId={product.id} Render={PriceAndCart} renderProps={{ product }} />
            </Suspense>

            {product.static_desc_ar && <p className={styles.desc}>{product.static_desc_ar}</p>}
          </div>
        </div>

        {related.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>منتجات ذات صلة</h2>
            <div className={styles.relatedGrid}>
              {related.map((p) => (
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
