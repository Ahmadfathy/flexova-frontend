import { Suspense } from "react";
import Link from "next/link";
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

/** Same PdpLayoutProps contract as aurora, deliberately different
 * structure: centered narrow column, image above info (not side-by-side),
 * matching noir's editorial-dark identity established in S1/S2. */
export function PdpLayout({ product, categoryLabel, related }: PdpLayoutProps) {
  return (
    <div className={styles.page}>
      <Header storeName={STORE_NAME} />

      <div className={styles.body}>
        {/* Static shell breadcrumb (spec §4.1 "breadcrumb · category | static
            (ISR)") — same gap/fix as noir's PlpLayout (S2). */}
        <nav className={styles.breadcrumb} aria-label="breadcrumb">
          <Link href="/">الرئيسية</Link>
          <span> / </span>
          {categoryLabel ? (
            <>
              <Link href={`/products?category=${product.category}`}>{categoryLabel}</Link>
              <span> / </span>
            </>
          ) : null}
          <span>{product.title_ar}</span>
        </nav>

        <p className={styles.eyebrow}>{categoryLabel ?? "المنتج"}</p>
        <h1 className={styles.title}>{product.title_ar}</h1>

        <Gallery images={product.images} title={product.title_ar} />

        <div className={styles.info}>
          <Suspense fallback={<PriceAndCartSkeleton />}>
            <ProductAvailabilityIsland productId={product.id} Render={PriceAndCart} renderProps={{ product }} />
          </Suspense>

          {product.static_desc_ar && <p className={styles.desc}>{product.static_desc_ar}</p>}
        </div>

        {related.length > 0 && (
          <section className={styles.relatedSection}>
            <p className={styles.relatedLabel}>مختارات ذات صلة</p>
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
