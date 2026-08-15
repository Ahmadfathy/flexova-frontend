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
