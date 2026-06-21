import type { PillVariant } from "@/components/patterns/StatusPill";
import type { ReceiptStatus, PurchasePaymentStatus, InboundEtaStatus } from "./usePurchasingData";

export function receiptPillVariant(s: ReceiptStatus): PillVariant {
  switch (s) {
    case "completed":          return "approved";
    case "partially_received": return "in-progress";
    case "pending":            return "pending";
  }
}

export function paymentPillVariant(s: PurchasePaymentStatus): PillVariant {
  switch (s) {
    case "paid":    return "paid";
    case "partial": return "pending";
    case "credit":  return "credit";
  }
}

export function inboundEtaPillVariant(s: InboundEtaStatus): PillVariant {
  switch (s) {
    case "accepted":  return "approved";
    case "pending":   return "pending";
    case "rejected":  return "rejected";
    case "unmatched": return "inactive";
  }
}
