import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getAudit } from "@/lib/mock/wholesale";
import type { AuditEntry } from "@/types/wholesale";

interface WholesaleAuditState {
  entries: AuditEntry[];
  /** Appends a new append-only entry (FE_13 §14 — every override/limit change is audited). */
  append: (entry: Omit<AuditEntry, "id" | "at">) => void;
}

export const useWholesaleAudit = create<WholesaleAuditState>()(
  persist(
    (set) => ({
      entries: getAudit(),
      append: (entry) =>
        set((s) => ({
          entries: [{ ...entry, id: crypto.randomUUID(), at: new Date().toISOString() }, ...s.entries],
        })),
    }),
    { name: "flexova.wholesale.audit" },
  ),
);
