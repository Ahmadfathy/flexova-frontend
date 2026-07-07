import type { SvcAppointment } from "@/stores/svcAppointments";
import type { SvcProvider } from "./catalog";

/** Calendar grid geometry — shared by the day-grid renderer and the drag/resize math so pixel↔time conversions never drift apart. */
export const PX_PER_MIN = 2;
export const GRID_START_MIN = 8 * 60;
export const GRID_END_MIN = 23 * 60;
export const GRID_HEIGHT = (GRID_END_MIN - GRID_START_MIN) * PX_PER_MIN;
export const SNAP_MIN = 15;
export const COLUMN_WIDTH = 208;
export const GUTTER_WIDTH = 52;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isSameDay(iso: string, day: Date): boolean {
  return iso.slice(0, 10) === dateKey(day);
}

export function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function snapMinutes(min: number): number {
  return Math.round(min / SNAP_MIN) * SNAP_MIN;
}

/** Builds a naive local ISO datetime (no timezone) for `day` at `minutes` past midnight. */
export function composeIso(day: Date, minutes: number): string {
  const clamped = Math.max(0, minutes);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateKey(day)}T${pad(h)}:${pad(m)}:00`;
}

/** Sat→Fri week start (Egypt week), midnight-normalized. */
export function startOfWeekSat(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 1) % 7; // days since Saturday
  d.setDate(d.getDate() - diff);
  return d;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function overlapsDates(aStart: string, aDur: number, bStart: string, bDur: number): boolean {
  const aS = new Date(aStart).getTime();
  const aE = aS + aDur * 60000;
  const bS = new Date(bStart).getTime();
  const bE = bS + bDur * 60000;
  return aS < bE && bS < aE;
}

/** Finds a genuine double-booking for `providerId` overlapping [start, start+durationMin) — cancelled/no-show appointments never conflict. */
export function findConflict(
  appointments: SvcAppointment[],
  providerId: string,
  start: string,
  durationMin: number,
  excludeId?: string
): SvcAppointment | null {
  return (
    appointments.find(
      (a) =>
        a.id !== excludeId &&
        a.provider_id === providerId &&
        a.status !== "cancelled" &&
        a.status !== "no-show" &&
        overlapsDates(start, durationMin, a.start, a.duration_min)
    ) ?? null
  );
}

export function isWithinAvailability(provider: SvcProvider, start: string, durationMin: number): boolean {
  const d = new Date(start);
  const dayKey = DAY_KEYS[d.getDay()];
  if (!provider.availability.days.includes(dayKey)) return false;

  const [fromH, fromM] = provider.availability.from.split(":").map(Number);
  const [toH, toM] = provider.availability.to.split(":").map(Number);
  const fromMin = fromH * 60 + fromM;
  const toMin = toH * 60 + toM;

  const startMin = d.getHours() * 60 + d.getMinutes();
  const endMin = startMin + durationMin;
  return startMin >= fromMin && endMin <= toMin;
}

/** Muted overlay segments (px, relative to the grid top) for the hours a provider is closed on `day` — either the whole column (day off) or the two edges outside `from`/`to`. */
export function providerOffHoursSegments(provider: SvcProvider, day: Date): { top: number; height: number }[] {
  const dayKey = DAY_KEYS[day.getDay()];
  if (!provider.availability.days.includes(dayKey)) {
    return [{ top: 0, height: GRID_HEIGHT }];
  }

  const [fromH, fromM] = provider.availability.from.split(":").map(Number);
  const [toH, toM] = provider.availability.to.split(":").map(Number);
  const fromMin = Math.max(GRID_START_MIN, fromH * 60 + fromM);
  const toMin = Math.min(GRID_END_MIN, toH * 60 + toM);

  const segments: { top: number; height: number }[] = [];
  if (fromMin > GRID_START_MIN) {
    segments.push({ top: 0, height: (fromMin - GRID_START_MIN) * PX_PER_MIN });
  }
  if (toMin < GRID_END_MIN) {
    segments.push({ top: (toMin - GRID_START_MIN) * PX_PER_MIN, height: (GRID_END_MIN - toMin) * PX_PER_MIN });
  }
  return segments;
}
