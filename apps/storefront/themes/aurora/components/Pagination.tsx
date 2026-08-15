import Link from "next/link";
import styles from "./Pagination.module.css";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Current filters, preserved across page links (spec §5.2 "indexable `?page=` links"). */
  baseParams: Record<string, string | undefined>;
}

export function Pagination({ page, totalPages, baseParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) if (v) params.set(k, v);
    params.set("page", String(p));
    return `/products?${params.toString()}`;
  }

  return (
    <nav className={styles.nav} aria-label="ترقيم الصفحات">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          className={p === page ? styles.pageActive : styles.page}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}
