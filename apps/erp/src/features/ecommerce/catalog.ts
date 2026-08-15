import type { PillVariant } from "@/components/patterns/StatusPill";
import type { EcOrderStatus, EcPaymentStatus, EcEtaStatus } from "./types";
import { getOnlineProduct } from "@/lib/mock/ecommerce";

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
