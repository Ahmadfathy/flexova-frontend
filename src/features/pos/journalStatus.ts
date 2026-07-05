import type { PillVariant } from "@/components/patterns/StatusPill";
import type { PosTicket } from "./useTerminalJournal";

/** Payment axis — independent from sync/ETA. Falls back to ticket lifecycle for voided/parked (no payment_status yet). */
export function paymentPillVariant(ticket: Pick<PosTicket, "payment_status" | "status">): PillVariant {
  if (ticket.payment_status === "paid") return "paid";
  if (ticket.payment_status === "partial") return "pending";
  if (ticket.payment_status === "returned") return "inactive";
  if (ticket.status === "voided") return "rejected";
  if (ticket.status === "parked") return "in-progress";
  return "default";
}

export function paymentStatusKey(ticket: Pick<PosTicket, "payment_status" | "status">): string {
  return ticket.payment_status ?? ticket.status;
}

/** Sync/ETA axis — independent from payment. */
export function syncPillVariant(status: PosTicket["sync_status"]): PillVariant {
  switch (status) {
    case "valid": return "approved";
    case "clearing": return "active";
    case "queued": return "pending";
    case "rejected": return "rejected";
    default: return "default"; // local
  }
}
