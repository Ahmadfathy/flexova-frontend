import type { HomeLayoutProps } from "@/lib/core/theme-contract";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { CategoryChips } from "../components/CategoryChips";
import { ProductCard } from "../components/ProductCard";
import { Footer } from "../components/Footer";
import styles from "./HomeLayout.module.css";

/** aurora's "grid-hero" structure (spec §2 layout id) — hero banner, then a
 * regular product grid. `noir`'s HomeLayout is a deliberately different
 * shape (editorial stacked list) — both consume the exact same
 * `HomeLayoutProps` from Shared Core. */
export function HomeLayout({ storeName, featured, categories }: HomeLayoutProps) {
  return (
    <div className={styles.page}>
      <Header storeName={storeName} />
      <Hero storeName={storeName} />
      <CategoryChips categories={categories.filter((c) => !c.isEmpty)} />
      <section className={styles.gridSection}>
        <h2 className={styles.sectionTitle}>منتجات مختارة</h2>
        <div className={styles.grid}>
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <Footer storeName={storeName} />
    </div>
  );
}
