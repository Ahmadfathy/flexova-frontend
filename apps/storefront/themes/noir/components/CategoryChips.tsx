import Link from "next/link";
import type { Category } from "@/lib/core/types";
import styles from "./CategoryChips.module.css";

export function CategoryChips({ categories }: { categories: Category[] }) {
  return (
    <div className={styles.row}>
      {categories.map((c, i) => (
        <span key={c.id} className={styles.item}>
          {i > 0 && <span className={styles.sep}>·</span>}
          <Link href={`/products?category=${c.id}`} className={styles.link}>
            {c.label_ar}
          </Link>
        </span>
      ))}
    </div>
  );
}
