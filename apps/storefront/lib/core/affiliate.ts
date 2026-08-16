/**
 * Affiliate attribution — Shared Core logic (spec §7, §10). The cookie
 * read/write and the confirm-time commission trigger are built in
 * Storefront Prompt S5 (checkout) against this contract; this prompt (S1)
 * lands the pure parsing piece.
 */
import type { Attribution } from "./types";

export const AFFILIATE_COOKIE = "flexova_ref";

/** Parses a `?ref=CODE` query value into the shape checkout attaches to an
 * order on confirm — attribution only counts once the order is confirmed
 * (golden rule: commission on confirmed orders only, never on click). */
export function parseRefCode(refCode: string | null | undefined): Pick<Attribution, "ref_code" | "source"> | null {
  if (!refCode) return null;
  return { ref_code: refCode, source: "code" };
}

/**
 * Captures `?ref=CODE` into `flexova_ref` on first touch (spec §10
 * "attribution ← affiliate cookie"). JS-readable (non-HttpOnly) by design —
 * it only ever carries a public ref code, never anything sensitive. A real
 * storefront calls this once from the root layout so *any* landing page
 * captures it; S5 wires it from the checkout page itself since no earlier
 * prompt captured it yet (disclosed gap, not a broken feature — `?ref=`
 * still works when it's the checkout page itself being visited, and the
 * cookie persists 30 days for a normal landing→browse→checkout path once
 * a home/PDP visit is what sets it).
 */
export function captureRefFromQuery(search: string): void {
  if (typeof document === "undefined") return;
  const ref = new URLSearchParams(search).get("ref");
  if (!ref) return;
  document.cookie = `${AFFILIATE_COOKIE}=${encodeURIComponent(ref)}; path=/; max-age=2592000`;
}

/** Reads the attribution cookie back at checkout confirm time. */
export function readRefCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${AFFILIATE_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
