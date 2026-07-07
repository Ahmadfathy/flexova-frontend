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
  cancellation_fee?: number;
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
    }),
    { name: "flexova.svc.appointments" }
  )
);
