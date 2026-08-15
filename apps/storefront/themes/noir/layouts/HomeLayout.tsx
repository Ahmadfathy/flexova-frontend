import type { HomeLayoutProps } from "@/lib/core/theme-contract";
import { Header } from "../components/Header";
import { ProductCard } from "../components/ProductCard";
import { Footer } from "../components/Footer";
import styles from "./HomeLayout.module.css";

/** noir's "editorial-dark" structure (spec §2 layout id) — no hero banner,
 * no grid: a centered masthead, then a single-column stacked list. Same
 * `HomeLayoutProps` contract as aurora's grid-hero, zero Shared-Core edits
 * needed to add this theme. */
export function HomeLayout({ storeName, featured }: HomeLayoutProps) {
  return (
    <div className={styles.page}>
      <Header storeName={storeName} />
      <section className={styles.listSection}>
        <p className={styles.sectionLabel}>مختارات الموسم</p>
        <div className={styles.list}>
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>
      <Footer storeName={storeName} />
    </div>
  );
}
