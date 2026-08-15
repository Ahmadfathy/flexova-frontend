import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getVanLoads } from "@/lib/mock/wholesale";
import type { VanLoad, VanLoadLine } from "@/types/wholesale";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface WholesaleVanLoadsState {
  loads: VanLoad[];
  addLoad: (load: VanLoad) => void;
  /** FE_13 §10 — receiving side confirms actual received qty per line. Any
   * non-zero variance sends the whole doc to "dispute" instead of "received". */
  confirmReceipt: (loadId: string, received: Record<string, number>) => void;
  /** FE_13 §10 — resolves a dispute: either the sent qty was wrong (adjust it
   * to match what actually arrived, variance clears to 0) or the variance is
   * accepted as real shrinkage/overage (kept as-is, with a reason on record). */
  resolveDispute: (loadId: string, resolution: { type: "adjust_sent" | "accept_variance"; reason: string }) => void;
}

/** Van load/return documents (FE_13 §2.4/§3.5/§10) — seeded from the fixture's own
 * history, incl. `vl_5499` (the return doc sh_van_299's own close produced) and
 * `vl_5502` (a deliberate dispute demo — pasta short by 2 cartons). */
export const useWholesaleVanLoads = create<WholesaleVanLoadsState>()(
  persist(
    (set) => ({
      loads: getVanLoads(),
      addLoad: (load) => set((s) => ({ loads: [load, ...s.loads] })),
      confirmReceipt: (loadId, received) =>
        set((s) => ({
          loads: s.loads.map((l) => {
            if (l.id !== loadId) return l;
            const lines: VanLoadLine[] = l.lines.map((line) => {
              const qty_received = round2(received[line.item_id] ?? line.qty_received);
              const variance = round2(qty_received - line.qty_sent);
              return { ...line, qty_received, variance: variance !== 0 ? variance : undefined };
            });
            const hasVariance = lines.some((line) => (line.variance ?? 0) !== 0);
            return {
              ...l,
              lines,
              status: hasVariance ? "dispute" : "received",
              _flag: hasVariance ? "dispute_open" : undefined,
            };
          }),
        })),
      resolveDispute: (loadId, resolution) =>
        set((s) => ({
          loads: s.loads.map((l) => {
            if (l.id !== loadId) return l;
            const lines: VanLoadLine[] =
              resolution.type === "adjust_sent"
                ? l.lines.map((line) => ({ ...line, qty_sent: line.qty_received, variance: undefined }))
                : l.lines;
            return {
              ...l,
              lines,
              status: "received",
              _flag: undefined,
              resolution: { type: resolution.type, reason: resolution.reason, resolved_at: new Date().toISOString() },
            };
          }),
        })),
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
