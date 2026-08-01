import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProjectsAuditEntry {
  id: string;
  at: string;
  user: string;
  action: string;
  entity: string;
  detail_ar: string;
  detail_en: string;
}

interface ProjectsAuditState {
  entries: ProjectsAuditEntry[];
  /** Append-only audit log (kickoff invariants #7 SoD, and §5.4 close-with-open-work),
   * mirrors `usePlayAudit`'s shape/append convention exactly. No fixture seed — entries
   * only ever accrue from here on. */
  append: (entry: Omit<ProjectsAuditEntry, "id" | "at">) => void;
}

export const useProjectsAudit = create<ProjectsAuditState>()(
  persist(
    (set) => ({
      entries: [],
      append: (entry) =>
        set((s) => ({
          entries: [{ ...entry, id: crypto.randomUUID(), at: new Date().toISOString() }, ...s.entries],
        })),
    }),
    { name: "flexova.projects.audit" }
  )
);
