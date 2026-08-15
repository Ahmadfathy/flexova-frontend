import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getVisits } from "@/lib/mock/wholesale";
import type { Visit } from "@/types/wholesale";

interface WholesaleVisitsState {
  visits: Visit[];
  addVisits: (newVisits: Visit[]) => void;
  updateVisit: (id: string, patch: Partial<Visit>) => void;
}

/** Live visits store, seeded from the fixture — "توليد خطة اليوم" (FE_13 §7) writes here. */
export const useWholesaleVisits = create<WholesaleVisitsState>()(
  persist(
    (set) => ({
      visits: getVisits(),
      addVisits: (newVisits) => set((s) => ({ visits: [...newVisits, ...s.visits] })),
      updateVisit: (id, patch) =>
        set((s) => ({ visits: s.visits.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
    }),
    { name: "flexova.wholesale.visits" },
  ),
);
