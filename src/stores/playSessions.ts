import { create } from "zustand";
import { getSessions } from "@/lib/mock/play";
import type { Session } from "@/features/play/types";

const SEED_SESSIONS: Record<string, Session> = Object.fromEntries(
  getSessions().map((s) => [s.id, s])
);

interface PlaySessionsState {
  sessions: Record<string, Session>;
  /** Bumped once a second by a single interval in FloorGridPage (never per-card) so every
   * subscribed card re-renders and recomputes its own elapsed/remaining time and running
   * total on demand — nothing derived is ever stored on the session itself. */
  clock: number;
  tick: () => void;
}

/** No `persist` here (unlike the sibling `play*` settings stores): this step only reads
 * sessions from the fixtures for the floor grid — lifecycle actions (start/pause/end) land
 * in a later step, at which point persistence should be reconsidered together with them. */
export const usePlaySessions = create<PlaySessionsState>()((set) => ({
  sessions: SEED_SESSIONS,
  clock: 0,
  tick: () => set((s) => ({ clock: s.clock + 1 })),
}));
