import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getVanLoads } from "@/lib/mock/wholesale";
import type { VanLoad } from "@/types/wholesale";

interface WholesaleVanLoadsState {
  loads: VanLoad[];
  addLoad: (load: VanLoad) => void;
}

/** Van load/return documents (FE_13 §2.4/§3.5) — seeded from the fixture's own
 * history, incl. `vl_5499` (the return doc sh_van_299's own close produced),
 * the exact shape a new shift-close writes here too. */
export const useWholesaleVanLoads = create<WholesaleVanLoadsState>()(
  persist(
    (set) => ({
      loads: getVanLoads(),
      addLoad: (load) => set((s) => ({ loads: [load, ...s.loads] })),
    }),
    { name: "flexova.wholesale.van_loads" },
  ),
);

/** Both "VL-" (load) and "VR-" (return) numbers share one counter in the fixture
 * (5499, 5501, 5502…) — matched here rather than keyed per-type. */
export function nextVanLoadNumber(loads: VanLoad[], type: "load" | "return"): string {
  const max = loads.reduce((m, l) => {
    const n = parseInt(l.number.replace(/\D/g, ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 5499);
  const prefix = type === "load" ? "VL" : "VR";
  return `${prefix}-${max + 1}`;
}
