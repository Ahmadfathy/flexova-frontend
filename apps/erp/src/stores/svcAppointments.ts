import { create } from "zustand";
import { persist } from "zustand/middleware";
import svcFixtures from "@/lib/mock/fixtures/svc.fixtures.json";
import { findConflict, isWithinAvailability } from "@/features/svc/scheduling";
import { findProvider } from "@/features/svc/catalog";

export type AppointmentStatus =
  | "booked" | "confirmed" | "checked-in" | "in-service" | "completed" | "no-show" | "cancelled";

export interface SvcAppointment {
  id: string;
  number: string;
  client_id: string;
  /** Set instead of `client_id` for a walk-in (no CRM record). */
  walk_in_name?: string;
  provider_id: string;
  services: string[];
  /** Naive local ISO, no timezone — e.g. "2026-07-07T11:00:00" (same convention as fnb checks). */
  start: string;
  duration_min: number;
  status: AppointmentStatus;
  source: string;
  package_covered: boolean;
  package_id?: string;
  branch_id: string;
  ticket_id?: string;
  notes?: string;
  cancellation_fee?: number;
  /** Reason text for the most recent cancel/no-show action. */
  reason?: string;
}

interface FixtureAppointment {
  id: string; number: string; client_id: string; provider_id: string; services: string[];
  start: string; duration_min: number; status: string; source: string;
  package_covered: boolean; package_id?: string; branch_id: string; ticket_id?: string;
  cancellation_fee?: number;
}

const SEED_APPOINTMENTS = (svcFixtures.appointments as FixtureAppointment[]).reduce<Record<string, SvcAppointment>>(
  (acc, a) => {
    acc[a.id] = { ...a, status: a.status as AppointmentStatus };
    return acc;
  },
  {}
);

export type RescheduleResult = "ok" | "conflict" | "warned_availability";

export interface BookInput {
  client_id: string;
  walk_in_name?: string;
  provider_id: string;
  services: string[];
  start: string;
  duration_min: number;
  branch_id: string;
  source: string;
  notes?: string;
  package_covered: boolean;
  package_id?: string;
}

export type EditableInput = Omit<BookInput, "branch_id" | "source">;

let bookingSeq = 6; // fixtures seed apt_5001..apt_5005 — next synthetic id continues from 5006

interface SvcAppointmentsState {
  appointments: Record<string, SvcAppointment>;
  /**
   * Moves/resizes an appointment (drag on the calendar). Hard-blocks on a genuine
   * double-booking (same provider, overlapping time) — returns "conflict" and leaves
   * the store untouched. Outside-availability is a soft warning only (flag-don't-block,
   * carried from POS/F&B): the move still commits, caller toasts "warned_availability".
   */
  rescheduleAppointment: (
    id: string,
    patch: { provider_id: string; start: string; duration_min?: number }
  ) => RescheduleResult;
  /** Creates a new appointment (status "booked"). Same conflict/availability rules as reschedule. */
  bookAppointment: (input: BookInput) => { result: RescheduleResult; id: string };
  /** Patches an existing, non-terminal appointment's booking fields — re-checks conflict/availability. */
  updateAppointment: (id: string, patch: EditableInput) => RescheduleResult;
  /** Advances the lifecycle status without touching booking fields (confirm/check-in/start). */
  setLifecycleStatus: (id: string, status: AppointmentStatus) => void;
  /** Completes the appointment and returns the Service Ticket id (created if not already set). */
  completeAppointment: (id: string) => string | null;
  cancelAppointment: (id: string, reason: string, fee: number) => void;
  markNoShow: (id: string, reason: string, fee: number) => void;
}

export const useSvcAppointments = create<SvcAppointmentsState>()(
  persist(
    (set, get) => ({
      appointments: SEED_APPOINTMENTS,

      rescheduleAppointment: (id, patch) => {
        const appt = get().appointments[id];
        if (!appt) return "conflict";
        const duration = patch.duration_min ?? appt.duration_min;

        const conflict = findConflict(
          Object.values(get().appointments),
          patch.provider_id,
          patch.start,
          duration,
          id
        );
        if (conflict) return "conflict";

        set((s) => ({
          appointments: {
            ...s.appointments,
            [id]: { ...appt, provider_id: patch.provider_id, start: patch.start, duration_min: duration },
          },
        }));

        const provider = findProvider(patch.provider_id);
        if (provider && !isWithinAvailability(provider, patch.start, duration)) return "warned_availability";
        return "ok";
      },

      bookAppointment: (input) => {
        const conflict = findConflict(Object.values(get().appointments), input.provider_id, input.start, input.duration_min);
        if (conflict) return { result: "conflict", id: "" };

        const seq = bookingSeq++;
        const id = `apt_${5000 + seq}`;
        const number = `SVC-${5000 + seq}`;
        const appt: SvcAppointment = { id, number, status: "booked", ...input };

        set((s) => ({ appointments: { ...s.appointments, [id]: appt } }));

        const provider = findProvider(input.provider_id);
        const result: RescheduleResult =
          provider && !isWithinAvailability(provider, input.start, input.duration_min) ? "warned_availability" : "ok";
        return { result, id };
      },

      updateAppointment: (id, patch) => {
        const appt = get().appointments[id];
        if (!appt) return "conflict";

        const conflict = findConflict(
          Object.values(get().appointments),
          patch.provider_id,
          patch.start,
          patch.duration_min,
          id
        );
        if (conflict) return "conflict";

        set((s) => ({ appointments: { ...s.appointments, [id]: { ...appt, ...patch } } }));

        const provider = findProvider(patch.provider_id);
        if (provider && !isWithinAvailability(provider, patch.start, patch.duration_min)) return "warned_availability";
        return "ok";
      },

      setLifecycleStatus: (id, status) => {
        set((s) => {
          const appt = s.appointments[id];
          if (!appt) return s;
          return { appointments: { ...s.appointments, [id]: { ...appt, status } } };
        });
      },

      completeAppointment: (id) => {
        const appt = get().appointments[id];
        if (!appt) return null;
        const ticketId = appt.ticket_id ?? `tk_svc_${id.replace(/^apt_/, "")}`;
        set((s) => ({
          appointments: { ...s.appointments, [id]: { ...appt, status: "completed", ticket_id: ticketId } },
        }));
        return ticketId;
      },

      cancelAppointment: (id, reason, fee) => {
        set((s) => {
          const appt = s.appointments[id];
          if (!appt) return s;
          return { appointments: { ...s.appointments, [id]: { ...appt, status: "cancelled", reason, cancellation_fee: fee } } };
        });
      },

      markNoShow: (id, reason, fee) => {
        set((s) => {
          const appt = s.appointments[id];
          if (!appt) return s;
          return { appointments: { ...s.appointments, [id]: { ...appt, status: "no-show", reason, cancellation_fee: fee } } };
        });
      },
    }),
    { name: "flexova.svc.appointments" }
  )
);
