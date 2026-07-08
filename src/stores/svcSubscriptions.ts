import { create } from "zustand";
import { persist } from "zustand/middleware";
import svcFixtures from "@/lib/mock/fixtures/svc.fixtures.json";

export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "past_due" | "suspended" | "cancelled";
export type AttemptResult = "success" | "failed";

export interface BillingAttempt {
  date: string;
  result: AttemptResult;
  amount: number;
  reason_ar?: string;
  reason_en?: string;
}

export interface SvcSubscription {
  id: string;
  client_id: string;
  plan_ar: string;
  plan_en: string;
  cycle: BillingCycle;
  amount: number;
  status: SubscriptionStatus;
  started_at: string;
  renewal_date: string;
  auto_renew: boolean;
  billing_channel: "modeled";
  attempts: BillingAttempt[];
  next_retry?: string;
  retries_left?: number;
  suspended_at?: string;
  note?: string;
}

const SEED_SUBSCRIPTIONS = (svcFixtures.subscriptions as SvcSubscription[]).reduce<Record<string, SvcSubscription>>(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {}
);

let subSeq = 1;

export interface SellSubscriptionInput {
  client_id: string;
  plan_ar: string;
  plan_en: string;
  cycle: BillingCycle;
  amount: number;
}

const MAX_RETRIES = 3;
const RETRY_INTERVAL_DAYS = 2;

interface SvcSubscriptionsState {
  subscriptions: Record<string, SvcSubscription>;
  sellSubscription: (input: SellSubscriptionInput) => string;
  /**
   * Client-side simulation of a billing-attempt cycle for a past-due subscription.
   * `forceFail` is wired to `?mock=retry_fail` so the exhausted-retries → suspended path
   * stays demoable/testable rather than depending on randomness.
   */
  retry: (id: string, forceFail: boolean) => AttemptResult;
  suspend: (id: string) => void;
  resume: (id: string) => void;
  cancel: (id: string) => void;
}

export const useSvcSubscriptions = create<SvcSubscriptionsState>()(
  persist(
    (set, get) => ({
      subscriptions: SEED_SUBSCRIPTIONS,

      sellSubscription: (input) => {
        const id = `sub_${8000 + (Object.keys(get().subscriptions).length + subSeq++)}`;
        const today = new Date().toISOString().slice(0, 10);
        const cycleMonths = input.cycle === "monthly" ? 1 : 12;
        const renewal = new Date();
        renewal.setMonth(renewal.getMonth() + cycleMonths);

        const sub: SvcSubscription = {
          id,
          client_id: input.client_id,
          plan_ar: input.plan_ar,
          plan_en: input.plan_en,
          cycle: input.cycle,
          amount: input.amount,
          status: "active",
          started_at: today,
          renewal_date: renewal.toISOString().slice(0, 10),
          auto_renew: true,
          billing_channel: "modeled",
          attempts: [{ date: today, result: "success", amount: input.amount }],
        };

        set((s) => ({ subscriptions: { ...s.subscriptions, [id]: sub } }));
        return id;
      },

      retry: (id, forceFail) => {
        const sub = get().subscriptions[id];
        if (!sub || sub.status !== "past_due") return "failed";

        const today = new Date().toISOString().slice(0, 10);

        if (!forceFail) {
          set((s) => ({
            subscriptions: {
              ...s.subscriptions,
              [id]: {
                ...sub,
                status: "active",
                attempts: [{ date: today, result: "success", amount: sub.amount }, ...sub.attempts],
                next_retry: undefined,
                retries_left: undefined,
                renewal_date: (() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + (sub.cycle === "monthly" ? 1 : 12));
                  return d.toISOString().slice(0, 10);
                })(),
              },
            },
          }));
          return "success";
        }

        const retriesLeft = Math.max(0, (sub.retries_left ?? MAX_RETRIES) - 1);
        const failedAttempt: BillingAttempt = {
          date: today,
          result: "failed",
          amount: sub.amount,
          reason_ar: "إعادة محاولة — فشل",
          reason_en: "Retry — failed",
        };

        if (retriesLeft <= 0) {
          set((s) => ({
            subscriptions: {
              ...s.subscriptions,
              [id]: {
                ...sub,
                status: "suspended",
                attempts: [failedAttempt, ...sub.attempts],
                suspended_at: today,
                next_retry: undefined,
                retries_left: 0,
                note: "exhausted retries → suspended",
              },
            },
          }));
        } else {
          const next = new Date();
          next.setDate(next.getDate() + RETRY_INTERVAL_DAYS);
          set((s) => ({
            subscriptions: {
              ...s.subscriptions,
              [id]: {
                ...sub,
                status: "past_due",
                attempts: [failedAttempt, ...sub.attempts],
                next_retry: next.toISOString().slice(0, 10),
                retries_left: retriesLeft,
              },
            },
          }));
        }
        return "failed";
      },

      suspend: (id) => {
        set((s) => {
          const sub = s.subscriptions[id];
          if (!sub) return s;
          return { subscriptions: { ...s.subscriptions, [id]: { ...sub, status: "suspended", suspended_at: new Date().toISOString().slice(0, 10) } } };
        });
      },

      resume: (id) => {
        set((s) => {
          const sub = s.subscriptions[id];
          if (!sub) return s;
          const today = new Date();
          const renewalInPast = new Date(sub.renewal_date) < today;
          const renewal = renewalInPast
            ? (() => { const d = new Date(today); d.setMonth(d.getMonth() + (sub.cycle === "monthly" ? 1 : 12)); return d.toISOString().slice(0, 10); })()
            : sub.renewal_date;
          return {
            subscriptions: {
              ...s.subscriptions,
              [id]: { ...sub, status: "active", renewal_date: renewal, suspended_at: undefined, next_retry: undefined, retries_left: undefined },
            },
          };
        });
      },

      cancel: (id) => {
        set((s) => {
          const sub = s.subscriptions[id];
          if (!sub) return s;
          return { subscriptions: { ...s.subscriptions, [id]: { ...sub, status: "cancelled" } } };
        });
      },
    }),
    { name: "flexova.svc.subscriptions" }
  )
);
