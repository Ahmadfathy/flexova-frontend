import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSeedAccessLog } from "@/lib/mock/healthcare";
import type { HealthcareAccessLogEntry } from "@/features/healthcare/types";

/**
 * PHI access log (spec §11/§0 golden rule — "clinical PHI is access-logged on
 * READ, not only on write"). Immutable/append-only, same convention as
 * `useProjectsAudit`/`usePlayAudit`, but keeps Healthcare's own who/whom/when
 * shape (actor/patient_id/surface/action/at) — this is a distinct log from the
 * carried sensitive-action audit log FE_16/FE_17 write to, because it fires on
 * every clinical *read*, not just approvals/overrides. Seeded from the fixture's
 * `access_log[]` so the log has visible history before any new event accrues.
 */
export interface HealthcareAuditState {
  entries: HealthcareAccessLogEntry[];
  /** Call on every clinical-surface open (encounter, patient 360 clinical tabs, results). */
  logAccess: (entry: Omit<HealthcareAccessLogEntry, "id" | "at">) => void;
}

export const useHealthcareAudit = create<HealthcareAuditState>()(
  persist(
    (set) => ({
      entries: getSeedAccessLog(),
      logAccess: (entry) =>
        set((s) => ({
          entries: [{ ...entry, id: crypto.randomUUID(), at: new Date().toISOString() }, ...s.entries],
        })),
    }),
    { name: "flexova.healthcare.access_log" }
  )
);
