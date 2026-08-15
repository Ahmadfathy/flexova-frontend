import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PlayAuditEntry {
  id: string;
  at: string;
  user: string;
  action: string;
  entity: string;
  detail_ar: string;
  detail_en: string;
}

interface PlayAuditState {
  entries: PlayAuditEntry[];
  /** Append-only audit log (§5.9 — cancelling a session must be logged), mirrors
   * `useWholesaleAudit`'s own shape/append convention exactly. No fixture seed: Play has no
   * pre-existing audit trail, entries only ever accrue from here on. */
  append: (entry: Omit<PlayAuditEntry, "id" | "at">) => void;
}

export const usePlayAudit = create<PlayAuditState>()(
  persist(
    (set) => ({
      entries: [],
      append: (entry) =>
        set((s) => ({
          entries: [{ ...entry, id: crypto.randomUUID(), at: new Date().toISOString() }, ...s.entries],
        })),
    }),
    { name: "flexova.play.audit" },
  ),
);
