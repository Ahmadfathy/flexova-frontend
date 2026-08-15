import type { Metadata } from "next";
import { getActiveTheme, getCatalogStatic, getCart } from "@/lib/core/mock-bff";
import { loadTheme } from "@/lib/core/theme-registry";
import { CartSeeder } from "@/lib/core/CartSeeder";

// spec §6 — "Client-only (not SEO)"
export const metadata: Metadata = {
  title: "السلة — متجر النيل",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const [activeTheme, catalog, seed] = await Promise.all([
    getActiveTheme(),
    getCatalogStatic(),
    getCart(),
  ]);
  const { CartLayout } = await loadTheme(activeTheme);

  return (
    <>
      <CartSeeder items={seed.items} />
      <CartLayout catalog={catalog} />
    </>
  );
}
