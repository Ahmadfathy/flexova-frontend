import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { CURRENT_EMPLOYEE_ID } from "@/features/projects/currentUser";

/**
 * The single active timer, persisted via idb-keyval (kickoff §11 / spec §7.3 — "the
 * timer keeps counting locally offline"). Deliberately separate from `useProjectsStore`
 * (plain localStorage via zustand `persist`) because idb-keyval survives the same reload/
 * offline scenarios more robustly and is what the spec names explicitly for this one
 * piece of state; the historical TimeEntry list has no such requirement.
 */
export interface ActiveTimer {
  project_id: string;
  milestone_id: string | null;
  description_ar: string;
  start_ts: string;
  employee_id: string;
}

interface ProjectsTimerState {
  active: ActiveTimer | null;
  hydrated: boolean;
  setHydrated: () => void;
  /** Returns the previous timer (if any) so the caller can save it as a draft TimeEntry before starting the new one. */
  start: (input: { project_id: string; milestone_id: string | null; description_ar: string }) => ActiveTimer | null;
  /** Returns the timer that was running (if any) so the caller can turn it into a draft TimeEntry. */
  stop: () => ActiveTimer | null;
}

const idbStorage = {
  getItem: async (name: string) => (await idbGet(name)) ?? null,
  setItem: async (name: string, value: string) => { await idbSet(name, value); },
  removeItem: async (name: string) => { await idbDel(name); },
};

export const useProjectsTimer = create<ProjectsTimerState>()(
  persist(
    (set, get) => ({
      active: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      start: (input) => {
        const previous = get().active;
        set({
          active: {
            project_id: input.project_id,
            milestone_id: input.milestone_id,
            description_ar: input.description_ar,
            start_ts: new Date().toISOString(),
            employee_id: CURRENT_EMPLOYEE_ID,
          },
        });
        return previous;
      },

      stop: () => {
        const current = get().active;
        set({ active: null });
        return current;
      },
    }),
    {
      name: "flexova.projects.timer",
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);
