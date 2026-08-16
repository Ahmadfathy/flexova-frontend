import type { Metadata } from "next";
import { getActiveTheme, getOrderTracking, matchCrmCustomer } from "@/lib/core/mock-bff";
import { loadTheme } from "@/lib/core/theme-registry";
import type { OnlineOrder } from "@/lib/core/types";
import type { SavedAddressDemo } from "@/lib/core/theme-contract";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "حسابي — متجر النيل",
  robots: { index: false, follow: false },
};

// Demo-only, illustrative "my orders" + saved address (spec §9) — there's
// no per-customer order/address association anywhere in the fixture or
// mock BFF (guest checkout never asks for an account), so this reuses
// §8's own tracking demo codes rather than inventing a fake join. Clearly
// disclosed in-page, not presented as real customer data.
const DEMO_ORDER_CODES = ["EC-5001", "EC-5002"];
const DEMO_ADDRESS: SavedAddressDemo = { name: "منى", phone: "01022223333", address: "المعادي، القاهرة", zone: "القاهرة والجيزة" };

interface AccountPageProps {
  searchParams: Promise<{ phone?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const { phone } = await searchParams;
  const activeTheme = await getActiveTheme();
  const { AccountLayout } = await loadTheme(activeTheme);

  if (!phone) {
    return <AccountLayout orders={[]} />;
  }

  const { crm_match } = await matchCrmCustomer(phone.trim());
  if (!crm_match) {
    return <AccountLayout phone={phone} matched={false} orders={[]} />;
  }

  const orders = (await Promise.all(DEMO_ORDER_CODES.map((code) => getOrderTracking(code)))).filter(
    (o): o is OnlineOrder => !!o
  );
  return <AccountLayout phone={phone} matched={true} orders={orders} address={DEMO_ADDRESS} />;
}
