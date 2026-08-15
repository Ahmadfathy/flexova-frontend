import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getRoutes } from "@/lib/mock/wholesale";
import type { Route } from "@/types/wholesale";

interface WholesaleRoutesState {
  routes: Route[];
  addRoute: (route: Route) => void;
  updateRoute: (id: string, patch: Partial<Route>) => void;
}

/** Live routes store, seeded from the fixture (FE_13 §7). */
export const useWholesaleRoutes = create<WholesaleRoutesState>()(
  persist(
    (set) => ({
      routes: getRoutes(),
      addRoute: (route) => set((s) => ({ routes: [route, ...s.routes] })),
      updateRoute: (id, patch) =>
        set((s) => ({ routes: s.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    }),
    { name: "flexova.wholesale.routes" },
  ),
);
