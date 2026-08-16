/**
 * Checkout / reservation — Shared Core logic (spec §7). This prompt (S1)
 * lands the pure, stateless pieces the reservation TTL guard needs — the
 * multi-step guest-checkout flow, Server Actions, and idempotency wiring
 * are built in Storefront Prompt S5 against this same contract.
 */
import type { Reservation } from "./types";

export function isReservationExpired(reservation: Pick<Reservation, "expires_at">, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(reservation.expires_at).getTime();
}

export function reservationSecondsLeft(reservation: Pick<Reservation, "expires_at">, now: Date = new Date()): number {
  return Math.max(0, Math.round((new Date(reservation.expires_at).getTime() - now.getTime()) / 1000));
}

/** "محجوز لك 10:00" (spec §7) — mm:ss countdown format. */
export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Step 1 delivery form (spec §7 "phone✱ + name✱ + address✱ — no signup"). */
export interface DeliveryFormInput {
  phone: string;
  name: string;
  address: string;
}

/** Returns one AR message per invalid field, empty object when valid. Kept
 * a pure function (no framework state) so both themes' delivery forms and
 * `useCheckout` share one validation rule set. */
export function validateDelivery(input: DeliveryFormInput): Partial<Record<keyof DeliveryFormInput, string>> {
  const errors: Partial<Record<keyof DeliveryFormInput, string>> = {};
  const phone = input.phone.trim();
  if (!phone) errors.phone = "رقم الموبايل مطلوب";
  else if (!/^01[0125]\d{8}$/.test(phone)) errors.phone = "رقم موبايل مصري غير صحيح";
  if (!input.name.trim()) errors.name = "الاسم مطلوب";
  if (!input.address.trim()) errors.address = "العنوان مطلوب";
  return errors;
}

export function computeCheckoutTotal(subtotal: number, shippingCost: number): number {
  return subtotal + shippingCost;
}

/**
 * One key per checkout session, generated once and reused across every
 * retry (payment failure, re-reserve, etc.) — the confirm Server Action
 * treats a repeat call with the same key as the same order, never a new
 * one (spec §7 "idempotency: double-submit = one order").
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
