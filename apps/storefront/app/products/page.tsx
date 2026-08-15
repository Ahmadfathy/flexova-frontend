import type { Metadata } from "next";
import { getActiveTheme, getCatalogStatic, getCategories } from "@/lib/core/mock-bff";
import { loadTheme } from "@/lib/core/theme-registry";
import { resolvePlp, parsePlpQuery, PLP_PAGE_SIZE } from "@/lib/core/catalog";

type SearchParams = Record<string, string | string[] | undefined>;

/** Unique meta per category + clean pagination (spec §5.4). Runs before the
 * page itself, off the same static catalog/category read. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const query = parsePlpQuery(await searchParams);
  const categories = await getCategories();
  const activeCategory = categories.find((c) => c.id === query.category);

  const title = activeCategory ? `${activeCategory.label_ar} — متجر النيل` : "كل المنتجات — متجر النيل";
  const description = activeCategory
    ? `تسوّق تشكيلة ${activeCategory.label_ar} في متجر النيل`
    : "تصفّح كل منتجات متجر النيل";

  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.page > 1) params.set("page", String(query.page));
  const canonical = `/products${params.toString() ? `?${params.toString()}` : ""}`;

  return { title, description, alternates: { canonical } };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = parsePlpQuery(await searchParams);

  const [activeTheme, allStatic, categories] = await Promise.all([
    getActiveTheme(),
    getCatalogStatic(),
    getCategories(),
  ]);

  const categoryHasAny = (categoryId: string) => allStatic.some((p) => p.category === categoryId);
  const result = await resolvePlp(allStatic, query, categoryHasAny);

  const { PlpLayout } = await loadTheme(activeTheme);

  return (
    <>
      {/* JSON-LD ItemList (spec §5.4) — only meaningful once the list resolved. */}
      {result.totalCount > 0 && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- static JSON-LD, no user input
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: (result.mode === "streaming" ? result.staticProducts : result.products).map(
                (p, i) => ({
                  "@type": "ListItem",
                  position: (result.page - 1) * PLP_PAGE_SIZE + i + 1,
                  url: `/products/${p.slug_en ?? p.id}`,
                  name: p.title_ar,
                })
              ),
            }),
          }}
        />
      )}
      <PlpLayout
        categories={categories}
        activeCategory={query.category}
        activeSort={query.sort}
        result={result}
      />
    </>
  );
}
