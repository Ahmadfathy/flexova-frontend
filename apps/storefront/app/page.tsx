import type { Metadata } from "next";
import { getActiveTheme, getCatalog, getCategories } from "@/lib/core/mock-bff";
import { loadTheme } from "@/lib/core/theme-registry";

export const metadata: Metadata = {
  title: "متجر النيل — تسوّق أونلاين",
  description: "تسوّق أحدث المنتجات في متجر النيل بأسعار حصرية وتوصيل سريع لكل المحافظات",
  alternates: { canonical: "/" },
};

/** Home (spec §9) — resolves `activeTheme` server-side, then dynamically
 * imports *only that theme's* module graph (theme-registry.ts) and hands
 * it Shared-Core data. Swapping `ACTIVE_THEME` changes the entire
 * look+structure below with zero edits to this file, Shared Core, or the
 * other theme — that's the S1 proof (spec §11.1). */
export default async function HomePage() {
  const [activeTheme, catalog, categories] = await Promise.all([
    getActiveTheme(),
    getCatalog(),
    getCategories(),
  ]);
  const { HomeLayout } = await loadTheme(activeTheme);

  // Matches the store name in the admin's StoreConfig fixture (spec §8) —
  // a real StoreConfig read replaces this literal once Admin Prompt A4 exists.
  return <HomeLayout storeName="متجر النيل" featured={catalog} categories={categories} />;
}
