import { useWholesaleOrders } from "@/stores/wholesaleOrders";
import { useWholesaleCreditReservations } from "@/stores/wholesaleCreditReservations";
import { useWholesaleCustomers } from "@/stores/wholesaleCustomers";
import { useWholesaleDeliveryNotes } from "@/stores/wholesaleDeliveryNotes";

export interface WholesaleInvoicePrefillLine {
  item_id: string;
  qty: number;
  uom_id: string;
  price: number;
  tax_type_id: string;
}

export interface WholesaleInvoicePrefill {
  customerId: string;
  warehouseId: string;
  note: string;
  lines: WholesaleInvoicePrefillLine[];
  orderIds: string[];
  deliveryNoteIds: string[];
}

/**
 * Called from the sales module's InvoiceEditorPage once the user actually
 * issues the invoice (FE_13 §6) — for each order behind the selected delivery
 * notes: releases its credit reservation and converts it to real AR, then
 * flips it to "invoiced". Marks the notes invoiced so they can't be
 * double-invoiced. No invoice-creation logic lives here — that stays entirely
 * in FE_02; this only settles the wholesale-side bookkeeping the hand-off implies.
 */
export function settleWholesaleDeliveryInvoicing(prefill: WholesaleInvoicePrefill, invoiceRef: string): void {
  const ordersState = useWholesaleOrders.getState();
  const reservationsState = useWholesaleCreditReservations.getState();
  const customersState = useWholesaleCustomers.getState();
  const notesState = useWholesaleDeliveryNotes.getState();

  for (const orderId of prefill.orderIds) {
    const order = ordersState.getOrder(orderId);
    if (!order) continue;

    if (order.credit_reservation_id) {
      const reservation = reservationsState.reservations.find(
        (r) => r.id === order.credit_reservation_id && r.status === "reserved",
      );
      if (reservation) {
        reservationsState.releaseReservation(reservation.id);
        customersState.adjustArBalance(order.customer_id, reservation.amount);
      }
    }

    ordersState.updateOrder(orderId, { status: "invoiced", invoice_id: invoiceRef });
  }

  notesState.markInvoiced(prefill.deliveryNoteIds, invoiceRef);
}
