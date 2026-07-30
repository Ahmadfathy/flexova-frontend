import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSessions } from "@/lib/mock/play";
import type { PlayMode, Session, SessionCustomer, SessionMode } from "@/features/play/types";

const SEED_SESSIONS: Record<string, Session> = Object.fromEntries(
  getSessions().map((s) => [s.id, s])
);

let seq = 1;
function nextId(prefix: string): string {
  return `${prefix}_${Date.now()}_${seq++}`;
}

export interface StartSessionInput {
  device_id: string | null;
  device_type_id: string;
  mode: SessionMode;
  customer: SessionCustomer | null;
  supervisor_id: string | null;
  play_mode: PlayMode | null;
  check_id: string;
  /** Resolved by the caller (Start Session sheet) via the rate engine's `resolveRule` for
   * postpaid, or `{ rule_id: null, price_per_unit: 0 }` for prepaid (time already paid —
   * fixtures' own convention, e.g. `ses_2`/`ses_5`). */
  firstSegment: { rule_id: string | null; price_per_unit: number };
  block_id?: string;
  block_duration_min?: number;
  prepaid_receipt_id?: string;
}

interface PlaySessionsState {
  sessions: Record<string, Session>;
  /** Bumped once a second by a single interval in FloorGridPage (never per-card) so every
   * subscribed card re-renders and recomputes its own elapsed/remaining time and running
   * total on demand — nothing derived is ever stored on the session itself. */
  clock: number;
  tick: () => void;
  /** Opens a session with a single running segment at `now` (§5.2) — postpaid counts up from
   * here, prepaid counts down against `block_duration_min`. Device state / check creation are
   * the caller's job (separate stores), matching how FloorGridPage already reads across
   * devices/deviceTypes/ratePlans/sessions independently rather than one store owning all of it. */
  startSession: (input: StartSessionInput) => Session;
}

export const usePlaySessions = create<PlaySessionsState>()(
  persist(
    (set) => ({
      sessions: SEED_SESSIONS,
      clock: 0,
      tick: () => set((s) => ({ clock: s.clock + 1 })),

      startSession: (input) => {
        const now = new Date().toISOString();
        const session: Session = {
          id: nextId("ses"),
          mode: input.mode,
          state: "active",
          device_id: input.device_id,
          device_type_id: input.device_type_id,
          customer: input.customer,
          supervisor_id: input.supervisor_id,
          play_mode: input.play_mode,
          check_id: input.check_id,
          segments: [{
            id: nextId("seg"),
            device_id: input.device_id,
            start: now,
            stop: null,
            rule_id: input.firstSegment.rule_id,
            price_per_unit: input.firstSegment.price_per_unit,
          }],
          ...(input.block_id !== undefined && { block_id: input.block_id }),
          ...(input.block_duration_min !== undefined && { block_duration_min: input.block_duration_min }),
          ...(input.prepaid_receipt_id !== undefined && { prepaid_receipt_id: input.prepaid_receipt_id }),
        };
        set((s) => ({ sessions: { ...s.sessions, [session.id]: session } }));
        return session;
      },
    }),
    { name: "flexova.play.sessions", partialize: (s) => ({ sessions: s.sessions }) }
  )
);
