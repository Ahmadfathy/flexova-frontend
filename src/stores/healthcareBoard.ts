import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getTodayBoard } from "@/lib/mock/healthcare";
import type { TodayBoardRow, BoardStatus, HcInvoice } from "@/features/healthcare/types";

/**
 * Today Board local state (spec §3.4 offline row states + §3.7 "check-in/collect
 * survive offline and sync"). Seeded once from `today_board[]`; check-in/collect
 * write optimistically with `sync:"local"`, then this simulates the round trip
 * to `syncing` → `synced` — unless `?mock=offline` is active, in which case the
 * row stays `local` (queued) exactly like the wholesale van sync queue's
 * offline-hold behaviour, just per-row instead of a separate queue entity.
 */

function isOfflineMock(): boolean {
  return new URLSearchParams(window.location.search).get("mock") === "offline";
}

function seedRows(): Record<string, TodayBoardRow> {
  return Object.fromEntries(
    getTodayBoard().map((r) => [r.appointment_id, { ...r, sync: "synced" as const }])
  );
}

interface HealthcareBoardState {
  rows: Record<string, TodayBoardRow>;
  checkIn: (appointmentId: string) => void;
  collect: (appointmentId: string) => void;
  /** Adds a locally-booked slot ("＋ موعد") — booked status, unsynced until it round-trips. */
  addBooking: (row: { appointment_id: string; time: string; patient_id: string; provider_id: string }) => void;
  /** Patient 360's "＋ ابدأ أول زيارة" (spec §6.4 empty state) — a walk-in with
   * no prior appointment, so it starts straight at checked-in (skips booked)
   * and still shows up on Today Board like any other in-progress visit. */
  addWalkIn: (row: { appointment_id: string; time: string; patient_id: string; provider_id: string }) => void;
  /** Demo-only: forces one row into a visible `syncing` badge under `?mock=offline` (fixture §_states_demo). */
  applyOfflineDemoRow: () => void;
  /** Encounter's Finish visit (spec §4.4) — flips the row to completed+owes so
   * reception sees it ready to collect, and stamps the invoice id so collect()
   * doesn't have to re-derive it from the patient. */
  completeVisit: (appointmentId: string, invoice: HcInvoice) => void;
}

function settleRow(appointmentId: string, set: (fn: (s: HealthcareBoardState) => Partial<HealthcareBoardState>) => void) {
  if (isOfflineMock()) return; // stays "local" — no network to round-trip to
  setTimeout(() => {
    set((s) => ({
      rows: {
        ...s.rows,
        [appointmentId]: s.rows[appointmentId]
          ? { ...s.rows[appointmentId], sync: "syncing" }
          : s.rows[appointmentId],
      },
    }));
    setTimeout(() => {
      set((s) => ({
        rows: {
          ...s.rows,
          [appointmentId]: s.rows[appointmentId]
            ? { ...s.rows[appointmentId], sync: "synced" }
            : s.rows[appointmentId],
        },
      }));
    }, 600);
  }, 400);
}

export const useHealthcareBoard = create<HealthcareBoardState>()(
  persist(
    (set) => ({
      rows: seedRows(),

      checkIn: (appointmentId) => {
        set((s) => {
          const row = s.rows[appointmentId];
          if (!row || row.status !== "booked") return s;
          return { rows: { ...s.rows, [appointmentId]: { ...row, status: "checked-in" as BoardStatus, sync: "local" } } };
        });
        settleRow(appointmentId, set);
      },

      collect: (appointmentId) => {
        set((s) => {
          const row = s.rows[appointmentId];
          if (!row) return s;
          return { rows: { ...s.rows, [appointmentId]: { ...row, collected: true, sync: "local" } } };
        });
        settleRow(appointmentId, set);
      },

      addBooking: (row) => {
        set((s) => ({
          rows: {
            ...s.rows,
            [row.appointment_id]: { ...row, status: "booked", patient_portion: null, collected: false, sync: "local" },
          },
        }));
        settleRow(row.appointment_id, set);
      },

      addWalkIn: (row) => {
        set((s) => ({
          rows: {
            ...s.rows,
            [row.appointment_id]: { ...row, status: "checked-in", patient_portion: null, collected: false, sync: "local" },
          },
        }));
        settleRow(row.appointment_id, set);
      },

      applyOfflineDemoRow: () => {
        set((s) => {
          const target = "ap_9006";
          const row = s.rows[target];
          if (!row || row.sync !== "synced") return s;
          return { rows: { ...s.rows, [target]: { ...row, sync: "syncing" } } };
        });
      },

      completeVisit: (appointmentId, invoice) => {
        set((s) => {
          const row = s.rows[appointmentId];
          if (!row) return s;
          return {
            rows: {
              ...s.rows,
              [appointmentId]: {
                ...row,
                status: "completed" as BoardStatus,
                patient_portion: invoice.patient_portion,
                collected: false,
                invoice_id: invoice.id,
                sync: "local",
              },
            },
          };
        });
        settleRow(appointmentId, set);
      },
    }),
    { name: "flexova.healthcare.board", partialize: (s) => ({ rows: s.rows }) }
  )
);
