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
