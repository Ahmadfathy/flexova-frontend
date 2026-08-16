"use server";

/**
 * Checkout is client-driven (spec §7 steps, TTL countdown, retries) but
 * every write — reservation, customer match, payment, confirm — has to go
 * through the mock BFF, which is `server-only`. Same bridge pattern as
 * `cart-actions.ts`: the Client Component checkout flow (`useCheckout`)
 * calls these directly, never imports `mock-bff.ts` itself.
 */
import {
  createReservation,
  getReservation,
  releaseReservation,
  matchCrmCustomer,
  processPayment,
  confirmOrder,
  type ConfirmOrderInput,
  type ConfirmOrderResult,
  type PaymentOutcome,
} from "./mock-bff";
import type { PaymentMethod, Reservation } from "./types";

type ReservationItem = { product_id: string; variant: string | null; qty: number };

/** `?mock=short_ttl` shrinks the 10-minute TTL to 12s so the expiry →
 * re-reserve flow can be verified live without an actual 10-minute wait —
 * never reachable outside that explicit query flag. */
function ttlOverrideFor(mock: string | null | undefined): number | undefined {
  return mock === "short_ttl" ? 12 : undefined;
}

export async function startReservationAction(items: ReservationItem[], mock?: string | null): Promise<Reservation> {
  return createReservation(items, ttlOverrideFor(mock));
}

export async function recheckReservationAction(id: string): Promise<Reservation | null> {
  return (await getReservation(id)) ?? null;
}

/** TTL expiry mid-checkout → re-check + re-reserve (spec §7 critical
 * state) — releases the dead reservation so it can never be double-committed. */
export async function reReserveAction(
  previousId: string,
  items: ReservationItem[],
  mock?: string | null
): Promise<Reservation> {
  await releaseReservation(previousId);
  return createReservation(items, ttlOverrideFor(mock));
}

export async function matchCustomerAction(phone: string): Promise<{ crm_match: boolean }> {
  return matchCrmCustomer(phone);
}

export async function submitPaymentAction(method: PaymentMethod, mock?: string | null): Promise<PaymentOutcome> {
  return processPayment(method, mock);
}

export async function confirmOrderAction(input: ConfirmOrderInput): Promise<ConfirmOrderResult> {
  return confirmOrder(input);
}
