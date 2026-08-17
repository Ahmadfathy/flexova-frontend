import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getAffiliates, getPayouts } from "@/lib/mock/ecommerce";
import { generateAffiliateCode, affiliateLink } from "@/features/ecommerce/catalog";
import type { EcAffiliate, EcPayout } from "@/features/ecommerce/types";

/**
 * Affiliates + payouts local state (spec §6). Seeded once from the
 * fixture; create/payout actions are local-only mutations (mock — v1 is
 * "admin-side view + manual payout", spec §6.3, no self-service affiliate
 * portal, so every action here is admin-initiated on the affiliate's
 * behalf, not a request the affiliate submitted themselves).
 */

function seedAffiliates(): Record<string, EcAffiliate> {
  return Object.fromEntries(getAffiliates().map((a) => [a.id, a]));
}

function seedPayouts(): Record<string, EcPayout> {
  return Object.fromEntries(getPayouts().map((p) => [p.id, p]));
}

let affiliateSeq = 1;
let payoutSeq = 2; // fixture's demo payout is pay_1

interface EcommerceAffiliatesState {
  affiliates: Record<string, EcAffiliate>;
  payouts: Record<string, EcPayout>;
  /** Data + commission_pct → auto-generates unique code/link (spec §6.2). Returns the new id. */
  createAffiliate: (input: { name_ar: string; phone: string; commission_pct: number }) => string;
  /** Admin requests a payout against the affiliate's current balance. */
  requestPayout: (affiliateId: string, amount: number) => void;
  /** "Admin approves → payment posted in Accounting" (spec §6.2/§6.4) —
   * one action does three things: settles the payout, reduces the balance
   * due, and stamps `posted_voucher_id` (the visible proof the posting
   * actually happened, same mock convention as `EcOrder.credit_note_id` —
   * see `EcPayout.posted_voucher_id`'s doc comment for why it's a stamp
   * and not a real Accounting-store write). */
  approvePayout: (payoutId: string) => void;
}

export const useEcommerceAffiliates = create<EcommerceAffiliatesState>()(
  persist(
    (set) => ({
      affiliates: seedAffiliates(),
      payouts: seedPayouts(),

      createAffiliate: (input) => {
        const id = `aff_new_${affiliateSeq++}`;
        const code = generateAffiliateCode();
        set((s) => ({
          affiliates: {
            ...s.affiliates,
            [id]: {
              id,
              name_ar: input.name_ar,
              phone: input.phone,
              code,
              link: affiliateLink(code),
              commission_pct: input.commission_pct,
              clicks: 0,
              attributed_orders: 0,
              balance_due: 0,
              status: "active",
            },
          },
        }));
        return id;
      },

      requestPayout: (affiliateId, amount) => {
        const id = `pay_${payoutSeq++}`;
        set((s) => ({
          payouts: {
            ...s.payouts,
            [id]: { id, affiliate_id: affiliateId, amount, status: "pending_approval", requested_at: new Date().toISOString().slice(0, 10) },
          },
        }));
      },

      approvePayout: (payoutId) => {
        set((s) => {
          const payout = s.payouts[payoutId];
          if (!payout || payout.status === "paid") return s;
          const affiliate = s.affiliates[payout.affiliate_id];
          return {
            payouts: { ...s.payouts, [payoutId]: { ...payout, status: "paid", posted_voucher_id: `pv_mock_${payout.id}` } },
            affiliates: affiliate
              ? { ...s.affiliates, [affiliate.id]: { ...affiliate, balance_due: Math.max(0, affiliate.balance_due - payout.amount) } }
              : s.affiliates,
          };
        });
      },
    }),
    { name: "flexova.ecommerce.affiliates", partialize: (s) => ({ affiliates: s.affiliates, payouts: s.payouts }) }
  )
);
