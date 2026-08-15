import fnbFixtures from "@/lib/mock/fixtures/fnb.fixtures.json";

export interface FnbCheckTotals {
  grand_total: number;
}

export interface FnbCheck {
  id: string;
  number: string;
  type: "dine-in" | "takeaway" | "delivery";
  table_id: string | null;
  opened_at: string;
  totals: FnbCheckTotals;
}

export const FNB_CHECKS = fnbFixtures.checks as FnbCheck[];

export function findFnbCheck(checkId: string | null): FnbCheck | undefined {
  if (!checkId) return undefined;
  return FNB_CHECKS.find(c => c.id === checkId);
}
