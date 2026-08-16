import type { PillVariant } from "@/components/patterns/StatusPill";
import type { EcOrderStatus, EcPaymentStatus, EcEtaStatus, EcOnlineProduct, EcStoreCategory, EcOrder, EcAffiliate, EcPayout } from "./types";
import { getOnlineProduct, getStoreCategories } from "@/lib/mock/ecommerce";

export function isOfflineMock(): boolean {
  return new URLSearchParams(window.location.search).get("mock") === "offline";
}

export const ORDER_STATUS_PILL: Record<EcOrderStatus, PillVariant> = {
  pending_payment: "pending",
  paid: "paid",
  processing: "in-progress",
  shipped: "active",
  delivered: "approved",
  returned: "rejected",
  cancelled: "inactive",
};

export const PAYMENT_STATUS_PILL: Record<EcPaymentStatus, PillVariant> = {
  pending: "pending",
  pending_cod: "credit",
  paid: "paid",
  refunded: "rejected",
};

export function etaStatusPill(status: EcEtaStatus): PillVariant {
  if (status === "accepted") return "paid";
  if (status === "credit_note") return "credit";
  if (status === "rejected") return "rejected";
  return "default";
}

/**
 * Status-driven contextual action (spec §5.2): the single primary next step
 * for an order, or null when the order is at a terminal/waiting state with
 * no admin-triggered forward action (delivered/returned/cancelled — or a
 * card order still pending_payment, which only "recheck_payment" advances).
 */
export type OrderPrimaryAction = "recheck_payment" | "start_processing" | "mark_shipped" | "mark_delivered";

export function primaryAction(status: EcOrderStatus): OrderPrimaryAction | null {
  switch (status) {
    case "pending_payment": return "recheck_payment";
    case "paid": return "start_processing";
    case "processing": return "mark_shipped";
    case "shipped": return "mark_delivered";
    default: return null;
  }
}

/** "any → return/cancel" (spec §5.2) — unavailable once already terminal. */
export function canReturnOrCancel(status: EcOrderStatus): boolean {
  return status !== "returned" && status !== "cancelled";
}

/** Return posts a credit note (money already moved); cancel does not. */
export function isReturnVsCancel(status: EcOrderStatus): "return" | "cancel" {
  return status === "shipped" || status === "delivered" ? "return" : "cancel";
}

export function productTitle(productId: string, lang: "ar" | "en"): string {
  const p = getOnlineProduct(productId);
  if (!p) return productId;
  return lang === "ar" ? p.title_ar : (p.title_en || p.title_ar);
}

/* ─────────────────────────────────────────────────────────────
   §3 Online products
   ───────────────────────────────────────────────────────────── */

export const PUBLISH_STATUS_PILL: Record<EcOnlineProduct["publish_status"], PillVariant> = {
  published: "approved",
  draft: "pending",
  hidden: "inactive",
};

/** Effective online price — the admin's own override when set, else the
 * inventory item's ERP base price (spec §3.2 "optional online_price"). */
export function effectivePrice(p: Pick<EcOnlineProduct, "online_price" | "erp_base_price">): number {
  return p.online_price ?? p.erp_base_price;
}

/**
 * spec §3.3 "Special: inventory item deleted/suspended in ERP → product
 * shows 'الصنف غير متاح' warning + auto-hidden from storefront (graceful)."
 * Independent of the admin's own `publish_status` — a published product
 * still gets auto-hidden the moment its backing ERP item is suspended.
 */
export function isAutoHidden(p: Pick<EcOnlineProduct, "erp_status">): boolean {
  return p.erp_status === "suspended";
}

export function categoryLabel(categoryId: string, lang: "ar" | "en"): string {
  const c = getStoreCategories().find((cat) => cat.id === categoryId);
  if (!c) return categoryId;
  return lang === "ar" ? c.name_ar : (c.name_en || c.name_ar);
}

/* ─────────────────────────────────────────────────────────────
   §4 Store categories
   ───────────────────────────────────────────────────────────── */

export function categoryName(c: EcStoreCategory, lang: "ar" | "en"): string {
  return lang === "ar" ? c.name_ar : (c.name_en || c.name_ar);
}

/** Root-first, each root followed by its own children in array order —
 * the display order the tree UI renders (spec §4 "hierarchy"). Only two
 * levels deep in the fixture; written generically in case a category
 * ever nests a level further. */
export function categoryTreeOrder(categories: EcStoreCategory[]): EcStoreCategory[] {
  const byParent = new Map<string | null, EcStoreCategory[]>();
  for (const c of categories) {
    const list = byParent.get(c.parent_id) ?? [];
    list.push(c);
    byParent.set(c.parent_id, list);
  }
  const out: EcStoreCategory[] = [];
  function walk(parentId: string | null) {
    for (const c of byParent.get(parentId) ?? []) {
      out.push(c);
      walk(c.id);
    }
  }
  walk(null);
  return out;
}

export function categoryDepth(c: EcStoreCategory, categories: EcStoreCategory[]): number {
  let depth = 0;
  let current: EcStoreCategory | undefined = c;
  while (current?.parent_id) {
    current = categories.find((x) => x.id === current!.parent_id);
    depth++;
  }
  return depth;
}

/** A product count per category (spec §4 "assign products") — how many
 * *linked* online products currently reference each category, used for
 * the tree's own count badges and to guard against deleting a category
 * that's still in use. */
export function productCountByCategory(products: EcOnlineProduct[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of products) counts[p.store_category] = (counts[p.store_category] ?? 0) + 1;
  return counts;
}

/* ─────────────────────────────────────────────────────────────
   §6 Affiliates
   ───────────────────────────────────────────────────────────── */

export const AFFILIATE_STATUS_PILL: Record<EcAffiliate["status"], PillVariant> = {
  active: "approved",
  inactive: "inactive",
};

export const PAYOUT_STATUS_PILL: Record<EcPayout["status"], PillVariant> = {
  pending_approval: "pending",
  approved: "in-progress",
  paid: "paid",
};

/**
 * "Confirmed" for commission purposes (spec §6.4/§10 golden rule —
 * "confirmed + attributed order → affiliate commission (confirmed
 * only)"): payment has actually gone through. `pending_payment` hasn't
 * confirmed anything yet; `returned`/`cancelled` reverse the sale, so
 * commission doesn't survive either — only the four statuses between
 * those two extremes count.
 */
export function isCommissionEligible(status: EcOrderStatus): boolean {
  return status === "paid" || status === "processing" || status === "shipped" || status === "delivered";
}

export function affiliateOrders(affiliateId: string, orders: EcOrder[]): EcOrder[] {
  return orders.filter((o) => o.affiliate_id === affiliateId);
}

/** Computed from the attribution log itself — a transparency figure next
 * to `balance_due` (the fixture/store's own authoritative "owed now"
 * field), not a replacement for it; the two can legitimately diverge
 * once payouts have been made against past commission. */
export function commissionEarned(affiliateId: string, orders: EcOrder[], commissionPct: number): number {
  const eligible = affiliateOrders(affiliateId, orders).filter((o) => isCommissionEligible(o.status));
  const total = eligible.reduce((sum, o) => sum + o.total, 0);
  return Math.round((total * commissionPct) / 100);
}

export function generateAffiliateCode(): string {
  return `AFF${Math.floor(1000 + Math.random() * 9000)}`;
}

export function affiliateLink(code: string): string {
  return `https://nilestore.eg/?ref=${code}`;
}
