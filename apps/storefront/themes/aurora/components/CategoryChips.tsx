import Link from "next/link";
import type { Category } from "@/lib/core/types";
import styles from "./CategoryChips.module.css";

export function CategoryChips({ categories }: { categories: Category[] }) {
  return (
    <div className={styles.row}>
      {categories.map((c) => (
        <Link key={c.id} href={`/products?category=${c.id}`} className={styles.chip}>
          {c.label_ar}
        </Link>
      ))}
    </div>
  );
}
