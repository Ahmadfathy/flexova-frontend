import { addMonths, addYears, differenceInCalendarDays, formatISO } from "date-fns";
import svcFixtures from "@/lib/mock/fixtures/svc.fixtures.json";
import type { SvcPackage } from "@/stores/svcPackages";
import type { SvcSubscription, BillingCycle } from "@/stores/svcSubscriptions";

export type PackageDisplayStatus = "active" | "expired" | "used-up";

/** Derived, not stored — a package can lapse (`valid_until` passed) without any write happening. */
export function packageDisplayStatus(pkg: SvcPackage, today: Date = new Date()): PackageDisplayStatus {
  if (pkg.remaining <= 0) return "used-up";
  if (new Date(pkg.valid_until) < today) return "expired";
  return "active";
}

export function todayIso(): string {
  return formatISO(new Date(), { representation: "date" });
}

export function advanceByCycle(fromIso: string, cycle: BillingCycle): string {
  const from = new Date(fromIso);
  const next = cycle === "monthly" ? addMonths(from, 1) : addYears(from, 1);
  return formatISO(next, { representation: "date" });
}

export function daysUntil(dateIso: string, today: Date = new Date()): number {
  return differenceInCalendarDays(new Date(dateIso), today);
}

/** Active subscriptions renewing within a week — informational warning, doesn't change status. */
export function isNearRenewal(sub: SvcSubscription, today: Date = new Date()): boolean {
  return sub.status === "active" && daysUntil(sub.renewal_date, today) <= 7 && daysUntil(sub.renewal_date, today) >= 0;
}

interface SellablePlan {
  key: string;
  plan_ar: string;
  plan_en: string;
  cycle: BillingCycle;
  amount: number;
}

/** No dedicated plan-catalog fixture exists — the sellable list is the distinct plans already seeded on `subscriptions`. */
export const SELLABLE_PLANS: SellablePlan[] = Array.from(
  new Map(
    (svcFixtures.subscriptions as { plan_ar: string; plan_en: string; cycle: string; amount: number }[]).map((s) => [
      s.plan_ar,
      { key: s.plan_ar, plan_ar: s.plan_ar, plan_en: s.plan_en, cycle: s.cycle as BillingCycle, amount: s.amount },
    ])
  ).values()
);

/** Default package validity when selling a new one — 6 months, no fixture precedent either way. */
export function defaultPackageValidUntil(): string {
  return formatISO(addMonths(new Date(), 6), { representation: "date" });
}
