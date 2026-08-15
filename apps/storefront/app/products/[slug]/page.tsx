import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getActiveTheme, getCatalogStatic, getProductStaticBySlug, getRelatedStatic,
  getCategories, getProductDynamicCached,
} from "@/lib/core/mock-bff";
import { loadTheme } from "@/lib/core/theme-registry";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** ISR (spec §4.1) — every known product gets a statically-generated path
 * at build time; a slug not in this list (e.g. a future product, or one
 * that was never published) falls through to on-demand rendering, still
 * followed by `notFound()` below if it truly doesn't exist. */
export async function generateStaticParams() {
  const all = await getCatalogStatic();
  return all.map((p) => ({ slug: p.slug_en ?? p.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductStaticBySlug(slug);
  if (!product) return {};

  const title = product.seo.meta_title_ar ?? `${product.title_ar} — متجر النيل`;
  const description = product.static_desc_ar ?? product.title_ar;

  return {
    title,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductStaticBySlug(slug);

  // True 404 (spec §4.4) — not a themed "not found" message rendered at
  // 200; notFound() makes Next render app/products/[slug]/not-found.tsx
  // and return a real 404 status, correct for SEO/crawlers.
  if (!product) notFound();

  const [activeTheme, categories, related, dynamicForSeo] = await Promise.all([
    getActiveTheme(),
    getCategories(),
    getRelatedStatic(product.category, product.id),
    // Resolved once here (cached — see getProductDynamicCached) so
    // JSON-LD below reflects real current price/availability even though
    // the *visual* price/cart block resolves independently via its own
    // <Suspense> island inside PdpLayout (spec §4.4 "page doesn't wait").
    getProductDynamicCached(product.id),
  ]);
  const categoryLabel = categories.find((c) => c.id === product.category)?.label_ar;

  const { PdpLayout } = await loadTheme(activeTheme);

  return (
    <>
      {/* JSON-LD Product schema (spec §4.5) */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- static JSON-LD, no user input
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title_ar,
            description: product.static_desc_ar,
            category: categoryLabel,
            offers: {
              "@type": "Offer",
              priceCurrency: "EGP",
              price: dynamicForSeo.price ?? undefined,
              availability:
                dynamicForSeo.in_stock === false
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/InStock",
            },
          }),
        }}
      />
      <PdpLayout product={product} categoryLabel={categoryLabel} related={related} />
    </>
  );
}
