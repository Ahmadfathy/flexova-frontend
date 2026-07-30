import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSessions } from "@/lib/mock/play";
import { splitOnBoundary } from "@/features/play/rate-engine";
import type { PlayMode, RatePlan, Session, SessionCustomer, SessionMode } from "@/features/play/types";

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
  /** Pause (§5.3/§6): closes the running segment at `now` — the gap starting here is simply
   * never part of any segment, so it can never be billed. Device state flip is the caller's job. */
  pauseSession: (sessionId: string) => void;
  /** Resume (§5.3/§6): opens a brand-new segment at `now`, priced by whatever rule the caller
   * already resolved for the current moment (mirrors `startSession`'s `firstSegment` — the rate
   * engine call itself belongs to the caller, this store only ever stores the result). */
  resumeSession: (
    sessionId: string,
    deviceId: string | null,
    resolvedSegment: { rule_id: string | null; price_per_unit: number }
  ) => void;
  /**
   * Peak/off-peak auto-split (§6) — background, no cashier action. Called once per shared tick
   * (never per-card) from FloorGridPage. For every `active`, POSTPAID session with a still-open
   * segment, splits it at every rate-window boundary crossed since it opened (via the real rate
   * engine's `splitOnBoundary`, never reimplemented here). Prepaid sessions are never split —
   * their time is a flat already-paid block, immune to peak/off-peak windows. `resolveRatePlan`
   * is injected by the caller so this store never needs to import `usePlayRatePlans`/
   * `usePlayDeviceTypes` directly. Returns the ids of sessions that were actually split, so the
   * caller can toast if configured to.
   */
  splitDueSegments: (resolveRatePlan: (deviceTypeId: string) => RatePlan | undefined, now: Date) => string[];
  /**
   * Transfer (§5.5): closes the running segment on the old device and opens a new one on
   * `targetDeviceId`, priced by whatever rule the caller already resolved against the TARGET
   * device type's rate plan (a PS4→PS5 transfer costing more is correct and intended — each
   * segment keeps its own device/rule/price, so a future invoice naturally gets one line per
   * device at that device's own rate). `session.device_id`/`device_type_id` move to the target
   * so later lookups (rate plan, drawer title, ...) resolve against where the session is NOW.
   * Device state flips (old → free, new → busy) and the check moving are the caller's job —
   * the check never referenced a device in the first place, so it "moves" for free.
   */
  transferSession: (
    sessionId: string,
    targetDeviceId: string,
    targetDeviceTypeId: string,
    resolvedSegment: { rule_id: string | null; price_per_unit: number }
  ) => void;
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

      pauseSession: (sessionId) => set((s) => {
        const session = s.sessions[sessionId];
        if (!session || session.state !== "active") return s;
        const lastSeg = session.segments[session.segments.length - 1];
        if (!lastSeg || lastSeg.stop !== null) return s;
        const segments = [...session.segments.slice(0, -1), { ...lastSeg, stop: new Date().toISOString() }];
        return { sessions: { ...s.sessions, [sessionId]: { ...session, state: "paused", segments } } };
      }),

      resumeSession: (sessionId, deviceId, resolvedSegment) => set((s) => {
        const session = s.sessions[sessionId];
        if (!session || session.state !== "paused") return s;
        const newSegment = {
          id: nextId("seg"),
          device_id: deviceId,
          start: new Date().toISOString(),
          stop: null,
          rule_id: resolvedSegment.rule_id,
          price_per_unit: resolvedSegment.price_per_unit,
        };
        return {
          sessions: {
            ...s.sessions,
            [sessionId]: { ...session, state: "active", segments: [...session.segments, newSegment] },
          },
        };
      }),

      splitDueSegments: (resolveRatePlan, now) => {
        const splitIds: string[] = [];
        set((s) => {
          let changed = false;
          const sessions = { ...s.sessions };
          for (const [id, session] of Object.entries(sessions)) {
            if (session.state !== "active") continue;
            // Prepaid time is a flat, already-paid block — peak/off-peak windows never apply
            // to it (fixtures' own convention: a prepaid session is always one unsplit segment
            // at price_per_unit 0, e.g. ses_2/ses_5). Splitting it would wrongly re-price the
            // piece via the rate plan's real rules.
            if (session.mode === "prepaid") continue;
            const lastSeg = session.segments[session.segments.length - 1];
            if (!lastSeg || lastSeg.stop !== null) continue;
            const ratePlan = resolveRatePlan(session.device_type_id);
            if (!ratePlan) continue;
            const pieces = splitOnBoundary(lastSeg, ratePlan, session.play_mode, now);
            if (pieces.length <= 1) continue;
            sessions[id] = { ...session, segments: [...session.segments.slice(0, -1), ...pieces] };
            splitIds.push(id);
            changed = true;
          }
          return changed ? { sessions } : s;
        });
        return splitIds;
      },

      transferSession: (sessionId, targetDeviceId, targetDeviceTypeId, resolvedSegment) => set((s) => {
        const session = s.sessions[sessionId];
        if (!session || session.state !== "active") return s;
        const lastSeg = session.segments[session.segments.length - 1];
        if (!lastSeg || lastSeg.stop !== null) return s;

        const now = new Date().toISOString();
        const closedSeg = { ...lastSeg, stop: now };
        const newSegment = {
          id: nextId("seg"),
          device_id: targetDeviceId,
          start: now,
          stop: null,
          rule_id: resolvedSegment.rule_id,
          price_per_unit: resolvedSegment.price_per_unit,
        };
        return {
          sessions: {
            ...s.sessions,
            [sessionId]: {
              ...session,
              device_id: targetDeviceId,
              device_type_id: targetDeviceTypeId,
              segments: [...session.segments.slice(0, -1), closedSeg, newSegment],
            },
          },
        };
      }),
    }),
    { name: "flexova.play.sessions", partialize: (s) => ({ sessions: s.sessions }) }
  )
);
