import type { Metadata } from "next";
import { getActiveTheme, getCatalogStatic, getShippingZones } from "@/lib/core/mock-bff";
import { loadTheme } from "@/lib/core/theme-registry";

// spec §7 / fixture `_meta.rendering.checkout` = "dynamic no-store" — the
// reservation/idempotency flow must never be served from a cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الدفع — متجر النيل",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [activeTheme, catalog, zones] = await Promise.all([
    getActiveTheme(),
    getCatalogStatic(),
    getShippingZones(),
  ]);
  const { CheckoutLayout } = await loadTheme(activeTheme);

  return <CheckoutLayout catalog={catalog} zones={zones} />;
}
