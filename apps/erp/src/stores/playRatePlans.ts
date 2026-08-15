import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getRatePlans } from "@/lib/mock/play";
import type { RatePlan, RateRule, PrepaidBlock, RateUnit, Rounding } from "@/features/play/types";

export interface SaveRatePlanInput {
  name_ar: string;
  name_en: string;
  unit: RateUnit;
  rounding: Rounding;
  min_units: number;
  rules: RateRule[];
  prepaid_blocks: PrepaidBlock[];
}

const SEED_RATE_PLANS: Record<string, RatePlan> = Object.fromEntries(
  getRatePlans().map((rp) => [rp.id, rp])
);

let seq = 1;
function nextId(): string {
  return `rp_${Date.now()}_${seq++}`;
}

interface PlayRatePlansState {
  ratePlans: Record<string, RatePlan>;
  createRatePlan: (input: SaveRatePlanInput) => RatePlan;
  updateRatePlan: (id: string, input: SaveRatePlanInput) => void;
}

export const usePlayRatePlans = create<PlayRatePlansState>()(
  persist(
    (set) => ({
      ratePlans: SEED_RATE_PLANS,

      createRatePlan: (input) => {
        const rp: RatePlan = { id: nextId(), ...input };
        set((s) => ({ ratePlans: { ...s.ratePlans, [rp.id]: rp } }));
        return rp;
      },

      updateRatePlan: (id, input) => set((s) => {
        const existing = s.ratePlans[id];
        if (!existing) return s;
        return { ratePlans: { ...s.ratePlans, [id]: { ...existing, ...input } } };
      }),
    }),
    { name: "flexova.play.ratePlans" }
  )
);
