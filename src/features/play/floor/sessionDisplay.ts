import { sessionTotal } from "@/features/play/rate-engine";
import type { Check, RatePlan, Session } from "@/features/play/types";

const LIVE_STATES: Session["state"][] = ["active", "paused"];

export function isLive(session: Session): boolean {
  return LIVE_STATES.includes(session.state);
}

export function findDeviceSession(sessions: Session[], deviceId: string): Session | undefined {
  return sessions.find((s) => s.device_id === deviceId && isLive(s));
}

export function findTicketSessions(sessions: Session[], deviceTypeId: string): Session[] {
  return sessions.filter((s) => s.device_id === null && s.device_type_id === deviceTypeId && isLive(s));
}

/** Total elapsed time across every segment so far — `(stop ?? now) - start` per segment,
 * summed. Paused gaps are never billed and never counted: a paused session has no open
 * segment, so its total simply stops growing until resume opens a new one (§1 golden rule:
 * time is always derived from timestamps, never a stored duration). */
export function elapsedMs(session: Session, now: Date): number {
  return session.segments.reduce((sum, seg) => {
    const start = new Date(seg.start).getTime();
    const end = seg.stop ? new Date(seg.stop).getTime() : now.getTime();
    return sum + Math.max(0, end - start);
  }, 0);
}

/** Prepaid counts down from the paid block's duration; postpaid counts up. Countdown clamps
 * at zero for display (the near-empty alert / extend flow is a later step). */
export function remainingMsForPrepaid(session: Session, now: Date): number {
  const blockMs = (session.block_duration_min ?? 0) * 60_000;
  return Math.max(0, blockMs - elapsedMs(session, now));
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function cafeteriaTotal(check: Check | undefined): number {
  if (!check) return 0;
  return check.cafeteria_lines.reduce((sum, line) => sum + line.line_total, 0);
}

/** Session's running money total right now: time (priced live via the real rate engine —
 * never reimplemented here) + cafeteria lines. A prepaid session's time segments carry
 * `price_per_unit: 0` (already paid at start), so this naturally reduces to just the
 * cafeteria total for prepaid, with no special-casing needed. */
export function computeRunningTotal(
  session: Session,
  ratePlan: RatePlan | undefined,
  check: Check | undefined,
  now: Date
): number | null {
  if (!ratePlan) return null;
  const { timeTotal } = sessionTotal(session, ratePlan, now);
  return timeTotal + cafeteriaTotal(check);
}
