/**
 * FE_15 Play — the rate engine (Flexova_FE_15_Play_TimeBased.md §1, "the spine").
 * Pure, framework-free: no React, no I/O, no mutation of inputs. Every screen
 * (floor grid, session drawer, end & bill, session log) prices sessions through
 * these functions alone.
 *
 * Golden rule: time is always derived from start/stop timestamps — never a
 * stored, editable duration. Segments already carry the rule/price they were
 * opened or split at; this module resolves *which* rule applies at a moment
 * and turns segment spans into billable units and money.
 */
import type { PlayMode, RatePlan, RateRule, RateUnit, RateWindow, Session, TimeSegment } from "../types";

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

/** Cairo is UTC+2 year-round (no DST) — fixed offset keeps window/day-of-week
 * math independent of the host machine's timezone. */
const CAIRO_OFFSET_MIN = 120;

function toCairoShifted(at: Date): Date {
  return new Date(at.getTime() + CAIRO_OFFSET_MIN * 60_000);
}

function fromCairoShifted(shifted: Date): Date {
  return new Date(shifted.getTime() - CAIRO_OFFSET_MIN * 60_000);
}

function cairoInstant(fromShifted: Date, dayOffset: number, hh: number, mm: number): Date {
  const shifted = new Date(Date.UTC(
    fromShifted.getUTCFullYear(),
    fromShifted.getUTCMonth(),
    fromShifted.getUTCDate() + dayOffset,
    hh, mm, 0, 0
  ));
  return fromCairoShifted(shifted);
}

function parseHM(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { h, m };
}

function isInWindow(at: Date, window: RateWindow): boolean {
  const shifted = toCairoShifted(at);
  const dayCode = DAY_CODES[shifted.getUTCDay()];
  if (!window.days.includes(dayCode)) return false;

  const minuteOfDay = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  const { h: fh, m: fm } = parseHM(window.from);
  const { h: th, m: tm } = parseHM(window.to);
  const fromMin = fh * 60 + fm;
  const toMin = th * 60 + tm;

  if (fromMin <= toMin) return minuteOfDay >= fromMin && minuteOfDay <= toMin;
  return minuteOfDay >= fromMin || minuteOfDay <= toMin; // wraps past midnight
}

function ruleMatchesMode(rule: RateRule, playMode: PlayMode | null): boolean {
  return rule.play_mode === null || rule.play_mode === playMode;
}

/** Picks the matching rate rule for a moment: highest `priority` among rules
 * whose play_mode and window (day + time-of-day) both match; a null window is
 * the always-on fallback. */
export function resolveRule(ratePlan: RatePlan, at: Date, playMode: PlayMode | null): RateRule {
  const candidates = ratePlan.rules.filter(
    (r) => ruleMatchesMode(r, playMode) && (r.window === null || isInWindow(at, r.window))
  );
  if (candidates.length === 0) {
    throw new Error(`No rate rule resolves for plan ${ratePlan.id} at ${at.toISOString()} (play_mode=${playMode})`);
  }
  return candidates.reduce((best, r) => (r.priority > best.priority ? r : best));
}

/** Next moment the effective rule for `playMode` would change — a window
 * opening or closing. Only window-bearing rules create boundaries; the
 * default (null-window) fallback never does. Searches up to 9 days ahead,
 * enough to guarantee the next occurrence of any weekly-recurring window. */
export function nextBoundary(ratePlan: RatePlan, from: Date, playMode: PlayMode | null): Date | null {
  const windowRules = ratePlan.rules.filter((r) => ruleMatchesMode(r, playMode) && r.window !== null);
  if (windowRules.length === 0) return null;

  const fromShifted = toCairoShifted(from);
  let best: Date | null = null;

  for (let offset = 0; offset <= 8; offset++) {
    const dayShifted = new Date(Date.UTC(
      fromShifted.getUTCFullYear(), fromShifted.getUTCMonth(), fromShifted.getUTCDate() + offset
    ));
    const dayCode = DAY_CODES[dayShifted.getUTCDay()];

    for (const rule of windowRules) {
      const w = rule.window as RateWindow;
      if (!w.days.includes(dayCode)) continue;

      const { h: fh, m: fm } = parseHM(w.from);
      const { h: th, m: tm } = parseHM(w.to);
      const start = cairoInstant(fromShifted, offset, fh, fm);
      const end = new Date(cairoInstant(fromShifted, offset, th, tm).getTime() + 60_000);

      for (const candidate of [start, end]) {
        if (candidate.getTime() > from.getTime() && (!best || candidate.getTime() < best.getTime())) {
          best = candidate;
        }
      }
    }
  }
  return best;
}

function unitToMs(unit: RateUnit): number {
  switch (unit) {
    case "minute": return 60_000;
    case "15m": return 15 * 60_000;
    case "30m": return 30 * 60_000;
    case "hour": return 60 * 60_000;
  }
}

/** Duration → billable units: unit size, then rounding, then min_units floor. */
export function billableUnits(durationMs: number, ratePlan: RatePlan): number {
  const raw = durationMs / unitToMs(ratePlan.unit);
  let rounded: number;
  switch (ratePlan.rounding) {
    case "ceil": rounded = Math.ceil(raw); break;
    case "floor": rounded = Math.floor(raw); break;
    case "nearest": rounded = Math.round(raw); break;
  }
  return Math.max(rounded, ratePlan.min_units);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface PricedSegment {
  units: number;
  pricePerUnit: number;
  subtotal: number;
}

/** Prices one closed segment. Uses the segment's own `price_per_unit` (already
 * resolved when the segment was opened/split) — only `ratePlan.unit/rounding/
 * min_units` are consulted here. Callers must supply a closed segment (an
 * effective `stop`, real or "as of now") — see `sessionTotal` for open ones. */
export function priceSegment(segment: TimeSegment, ratePlan: RatePlan): PricedSegment {
  if (segment.stop === null) {
    throw new Error(`priceSegment requires a closed segment; segment ${segment.id} is still open`);
  }
  const durationMs = new Date(segment.stop).getTime() - new Date(segment.start).getTime();
  const units = billableUnits(durationMs, ratePlan);
  const pricePerUnit = segment.price_per_unit;
  return { units, pricePerUnit, subtotal: round2(units * pricePerUnit) };
}

export interface PricedSessionSegment extends PricedSegment {
  segment: TimeSegment;
}

/** Prices every segment of a session and sums them. A segment that is already
 * closed and carries stored `billable_units`/`subtotal` (fixtures' pattern for
 * past, invoiced segments) is taken as-is; any other closed segment is priced
 * fresh via `priceSegment`; the one still-open segment (if any) is priced to
 * `now`. This lets a single `ratePlan` argument stay correct even after a
 * transfer, since prior segments from a different device/plan already carry
 * their own baked-in numbers. */
export function sessionTotal(
  session: Session,
  ratePlan: RatePlan,
  now: Date
): { segments: PricedSessionSegment[]; timeTotal: number } {
  const segments = session.segments.map((segment): PricedSessionSegment => {
    if (segment.stop !== null && segment.billable_units !== undefined && segment.subtotal !== undefined) {
      return { segment, units: segment.billable_units, pricePerUnit: segment.price_per_unit, subtotal: segment.subtotal };
    }
    const effective: TimeSegment = segment.stop !== null ? segment : { ...segment, stop: now.toISOString() };
    const priced = priceSegment(effective, ratePlan);
    return { segment, ...priced };
  });

  const timeTotal = round2(segments.reduce((sum, s) => sum + s.subtotal, 0));
  return { segments, timeTotal };
}

/** Splits a segment at every rate-window boundary it crosses between its
 * start and its end (its `stop`, or `now` while still open). Each resulting
 * piece carries the rule/price in effect over that piece; the final piece
 * stays open (`stop: null`) if the source segment was open and no `now` was
 * given past which to close it. This is what auto-split (peak/off-peak
 * crossing) and any retroactive normalization of a too-long raw segment run
 * through. */
export function splitOnBoundary(
  segment: TimeSegment,
  ratePlan: RatePlan,
  playMode: PlayMode | null,
  now?: Date
): TimeSegment[] {
  const start = new Date(segment.start);
  const end = segment.stop !== null ? new Date(segment.stop) : (now ?? start);

  const cutPoints: Date[] = [start];
  let cursor = start;
  while (true) {
    const boundary = nextBoundary(ratePlan, cursor, playMode);
    if (!boundary || boundary.getTime() >= end.getTime()) break;
    cutPoints.push(boundary);
    cursor = boundary;
  }
  cutPoints.push(end);

  const pieceCount = cutPoints.length - 1;
  const pieces: TimeSegment[] = [];
  for (let i = 0; i < pieceCount; i++) {
    const pieceStart = cutPoints[i];
    const pieceEnd = cutPoints[i + 1];
    const isLastPiece = i === pieceCount - 1;
    const rule = resolveRule(ratePlan, pieceStart, playMode);
    pieces.push({
      ...segment,
      id: pieceCount > 1 ? `${segment.id}_${i + 1}` : segment.id,
      start: pieceStart.toISOString(),
      stop: isLastPiece && segment.stop === null ? null : pieceEnd.toISOString(),
      rule_id: rule.id,
      price_per_unit: rule.price_per_unit,
      billable_units: undefined,
      subtotal: undefined,
    });
  }
  return pieces;
}
