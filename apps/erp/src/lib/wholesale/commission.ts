import type { Rep } from "@/types/wholesale";

export interface CollectionCommission {
  rep_id: string;
  base: number;
  pct: number;
  amount: number;
  on: "collected";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Rep commission schemes referenced by `Rep.commission_scheme_id` — no live HR
 * engine exists to call (reps aren't even in `hr.fixtures.json`'s employees
 * table, and HR's own `commission_rules` uses a different id/rate for the same
 * concept). Mirrors repair's/svc's own local-compute workaround for the same
 * "no engine to call" situation.
 */
const COMMISSION_SCHEMES: Record<string, number> = {
  cs_collection_2pct: 2,
};

/** Commission basis for a rep's collection (FE_13 §3.4) — runs on collected, not sold. */
export function computeCollectionCommission(rep: Rep | undefined, collectedAmount: number): CollectionCommission | null {
  if (!rep) return null;
  const pct = COMMISSION_SCHEMES[rep.commission_scheme_id];
  if (!pct) return null;
  return { rep_id: rep.id, base: collectedAmount, pct, amount: round2((collectedAmount * pct) / 100), on: "collected" };
}
