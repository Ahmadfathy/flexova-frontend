/**
 * FE_13 §7 / UIUX_13 §3.2.4-3.2.5 — routes and day-plan generation.
 * Pure functions — no React, no store access (callers own persistence).
 */
import type { Route, Visit } from "@/types/wholesale";

/** Matches Date#getDay() (0=Sunday..6=Saturday) and the fixture's visit_days codes. */
export const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

export function weekdayCodeOf(dateStr: string): WeekdayCode {
  const d = new Date(`${dateStr}T00:00:00`);
  return WEEKDAY_CODES[d.getDay()];
}

/** The next date (including today) whose weekday matches `code`. */
export function nextDateForWeekday(code: WeekdayCode, from: Date = new Date()): string {
  const targetIdx = WEEKDAY_CODES.indexOf(code);
  const d = new Date(from);
  const diff = (targetIdx - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export type GenerateDayPlanResult =
  | { ok: true; created: Visit[] }
  | { ok: false; reason: "wrong_weekday" | "already_exists" };

/**
 * Creates one scheduled Visit per route customer (in `sequence` order) for
 * `date` — only if `date`'s weekday is one of the route's `visit_days`.
 * Idempotent: a second call for the same route+date returns `already_exists`
 * instead of creating duplicates (FE_13 §7 — "warns if a plan already exists").
 */
export function generateDayPlan(route: Route, date: string, existingVisits: Visit[]): GenerateDayPlanResult {
  const code = weekdayCodeOf(date);
  if (!route.visit_days.includes(code)) {
    return { ok: false, reason: "wrong_weekday" };
  }
  const alreadyExists = existingVisits.some((v) => v.route_id === route.id && v.date === date);
  if (alreadyExists) {
    return { ok: false, reason: "already_exists" };
  }

  const created: Visit[] = [...route.customers]
    .sort((a, b) => a.sequence - b.sequence)
    .map((c) => ({
      id: crypto.randomUUID(),
      date,
      route_id: route.id,
      rep_id: route.rep_id,
      customer_id: c.customer_id,
      sequence: c.sequence,
      status: "scheduled",
      doc_id: null,
      note: "",
    }));

  return { ok: true, created };
}
