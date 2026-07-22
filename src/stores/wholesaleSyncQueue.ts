import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSyncQueue } from "@/lib/mock/wholesale";
import type { SyncOp } from "@/types/wholesale";

interface WholesaleSyncQueueState {
  entries: SyncOp[];
  /** Transient — not persisted meaning beyond the current tab; drives SyncIndicator. */
  syncState: "idle" | "syncing" | "error";
  enqueue: (op: Omit<SyncOp, "id" | "created_at" | "status">) => void;
  /** Simulates a sync attempt — resolves all "pending" entries to "synced" unless
   * `?mock=sync_fail` is set, in which case it flips to the "error" state instead. */
  syncNow: () => Promise<void>;
}

export const useWholesaleSyncQueue = create<WholesaleSyncQueueState>()(
  persist(
    (set) => ({
      entries: getSyncQueue(),
      syncState: "idle",
      enqueue: (op) =>
        set((s) => ({
          entries: [
            { ...op, id: crypto.randomUUID(), created_at: new Date().toISOString(), status: "pending" },
            ...s.entries,
          ],
        })),
      syncNow: async () => {
        set({ syncState: "syncing" });
        await new Promise((r) => setTimeout(r, 900));
        const shouldFail = new URLSearchParams(window.location.search).get("mock") === "sync_fail";
        if (shouldFail) {
          set({ syncState: "error" });
          return;
        }
        set((s) => ({
          syncState: "idle",
          entries: s.entries.map((e) => (e.status === "pending" ? { ...e, status: "synced" } : e)),
        }));
      },
    }),
    { name: "flexova.wholesale.sync_queue" },
  ),
);
