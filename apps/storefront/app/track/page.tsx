import type { Metadata } from "next";
import { getActiveTheme, getOrderTracking } from "@/lib/core/mock-bff";
import { loadTheme } from "@/lib/core/theme-registry";

// spec §8 — a live ERP status read, never cached (same "dynamic no-store"
// treatment as cart/checkout — a stale delivered/shipped status is worse
// than a slower page).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تتبّع الطلب — متجر النيل",
  robots: { index: false, follow: false },
};

interface TrackPageProps {
  searchParams: Promise<{ code?: string; mock?: string }>;
}

export default async function TrackPage({ searchParams }: TrackPageProps) {
  const { code, mock } = await searchParams;
  const isOffline = mock === "offline";
  const activeTheme = await getActiveTheme();
  const { TrackLayout } = await loadTheme(activeTheme);

  // §8 "invalid code" covers both a genuinely unknown code and the
  // fixture's own `status: null` demo row — normalized to the same
  // `undefined` here so TrackLayout only has one "not found" branch.
  const raw = code && !isOffline ? await getOrderTracking(code) : undefined;
  const order = raw && raw.status != null ? raw : undefined;

  return <TrackLayout code={code} isOffline={isOffline} order={order} />;
}
