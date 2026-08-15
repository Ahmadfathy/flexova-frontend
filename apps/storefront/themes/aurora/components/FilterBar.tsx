import type { Category } from "@/lib/core/types";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  categories: Category[];
  activeCategory?: string;
  activeSort: string;
}

/** Plain GET `<form>` — filters/sort work with zero client JS (spec §5.2:
 * "filter/sort on static layer where possible"). Submitting just navigates
 * to `/products?...`, which the RSC page re-renders server-side. */
export function FilterBar({ categories, activeCategory, activeSort }: FilterBarProps) {
  return (
    <form method="get" action="/products" className={styles.bar}>
      <select name="category" defaultValue={activeCategory ?? ""} className={styles.select}>
        <option value="">كل الأقسام</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.label_ar}</option>
        ))}
      </select>

      <select name="sort" defaultValue={activeSort} className={styles.select}>
        <option value="featured">الأحدث</option>
        <option value="price_asc">السعر: من الأقل للأعلى</option>
        <option value="price_desc">السعر: من الأعلى للأقل</option>
      </select>

      <input type="number" name="minPrice" placeholder="أقل سعر" className={styles.priceInput} />
      <input type="number" name="maxPrice" placeholder="أعلى سعر" className={styles.priceInput} />

      <button type="submit" className={styles.submit}>تطبيق</button>
    </form>
  );
}
