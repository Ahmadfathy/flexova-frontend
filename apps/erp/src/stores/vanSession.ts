import { create } from "zustand";
import { persist } from "zustand/middleware";

interface VanSessionState {
  open: boolean;
  vanWarehouseId: string | null;
  repId: string | null;
  routeId: string | null;
  treasuryId: string | null;
  openingFloat: number;
  note: string;
  openedAt: string | null;

  openVanShift: (payload: {
    vanWarehouseId: string; repId: string; routeId: string | null;
    treasuryId: string; openingFloat: number; note: string;
  }) => void;
  closeVanSession: () => void;
}

/**
 * Van-specific "is a rep shift open" session (FE_13 §2.4/§2.5) — deliberately
 * separate from the shared retail `usePosShift` (which the fixture seeds as
 * already-open for the default demo terminal, so it can never demonstrate the
 * "no shift" gate). This one starts closed, giving /van/today a real,
 * reachable gate to /van/shift/open.
 */
export const useVanSession = create<VanSessionState>()(
  persist(
    (set) => ({
      open: false,
      vanWarehouseId: null,
      repId: null,
      routeId: null,
      treasuryId: null,
      openingFloat: 0,
      note: "",
      openedAt: null,

      openVanShift: (payload) =>
        set({
          open: true,
          ...payload,
          openedAt: new Date().toISOString(),
        }),
      closeVanSession: () =>
        set({
          open: false, vanWarehouseId: null, repId: null, routeId: null,
          treasuryId: null, openingFloat: 0, note: "", openedAt: null,
        }),
    }),
    { name: "flexova.van.session" },
  ),
);
