import { describe, expect, it } from "vitest";
import {
  billableUnits,
  nextBoundary,
  priceSegment,
  resolveRule,
  sessionTotal,
  splitOnBoundary,
} from "./rateEngine";
import type { RatePlan, Session, TimeSegment } from "../types";

// PlayStation-style plan: off-peak flat rules + a Friday/Saturday 18:00-23:59 peak
// window, single vs double play modes priced differently — mirrors rp_ps in
// play.fixtures.json but kept local so the test doesn't depend on fixture data.
const psPlan: RatePlan = {
  id: "rp_test_ps",
  name_ar: "بلايستيشن",
  name_en: "PlayStation",
  unit: "hour",
  rounding: "ceil",
  min_units: 1,
  rules: [
    { id: "off_single", price_per_unit: 30, window: null, play_mode: "single", priority: 1 },
    { id: "off_double", price_per_unit: 45, window: null, play_mode: "double", priority: 1 },
    { id: "peak_single", price_per_unit: 40, window: { days: ["FR", "SA"], from: "18:00", to: "23:59" }, play_mode: "single", priority: 5 },
    { id: "peak_double", price_per_unit: 60, window: { days: ["FR", "SA"], from: "18:00", to: "23:59" }, play_mode: "double", priority: 5 },
  ],
  prepaid_blocks: [],
};

// Flat, no-window plans (billiards / ping-pong style) — one device-type has no
// play_mode concept at all, so rules use play_mode: null.
const billiardPlan: RatePlan = {
  id: "rp_test_billiard",
  name_ar: "بلياردو",
  name_en: "Billiards",
  unit: "hour",
  rounding: "ceil",
  min_units: 1,
  rules: [{ id: "bl_off", price_per_unit: 50, window: null, play_mode: null, priority: 1 }],
  prepaid_blocks: [],
};

const pingpongPlan: RatePlan = {
  id: "rp_test_pingpong",
  name_ar: "بينج بونج",
  name_en: "Ping-pong",
  unit: "30m",
  rounding: "ceil",
  min_units: 1,
  rules: [{ id: "pp_flat", price_per_unit: 25, window: null, play_mode: null, priority: 1 }],
  prepaid_blocks: [],
};

// 2026-07-24 is a Friday (matches play.fixtures.json's now_ref week: 2026-07-23 = Thursday).
const FRI_MORNING = new Date("2026-07-24T10:00:00+02:00");
const FRI_PEAK = new Date("2026-07-24T19:00:00+02:00");

function segment(overrides: Partial<TimeSegment>): TimeSegment {
  return {
    id: "seg_x",
    device_id: "dev_x",
    start: "2026-07-24T17:00:00+02:00",
    stop: "2026-07-24T18:00:00+02:00",
    rule_id: "off_single",
    price_per_unit: 30,
    ...overrides,
  };
}

function session(overrides: Partial<Session>): Session {
  return {
    id: "ses_x",
    mode: "postpaid",
    state: "active",
    device_id: "dev_x",
    device_type_id: "dt_x",
    customer: null,
    supervisor_id: null,
    play_mode: null,
    check_id: "chk_x",
    segments: [],
    ...overrides,
  };
}

describe("resolveRule", () => {
  it("resolves the off-peak default when outside any window", () => {
    const rule = resolveRule(psPlan, FRI_MORNING, "single");
    expect(rule.id).toBe("off_single");
  });

  it("resolves the peak rule when inside its window", () => {
    const rule = resolveRule(psPlan, FRI_PEAK, "single");
    expect(rule.id).toBe("peak_single");
  });

  it("resolves different rules for single vs double play_mode at the same instant", () => {
    expect(resolveRule(psPlan, FRI_PEAK, "single").id).toBe("peak_single");
    expect(resolveRule(psPlan, FRI_PEAK, "double").id).toBe("peak_double");
    expect(resolveRule(psPlan, FRI_MORNING, "single").price_per_unit).toBe(30);
    expect(resolveRule(psPlan, FRI_MORNING, "double").price_per_unit).toBe(45);
  });

  it("resolves the single flat rule of a plan with no window rules at all", () => {
    expect(resolveRule(pingpongPlan, FRI_MORNING, null).id).toBe("pp_flat");
    expect(resolveRule(pingpongPlan, FRI_PEAK, null).id).toBe("pp_flat");
  });
});

describe("nextBoundary", () => {
  it("returns null for a plan with no window rules", () => {
    expect(nextBoundary(pingpongPlan, FRI_MORNING, null)).toBeNull();
    expect(nextBoundary(billiardPlan, FRI_MORNING, null)).toBeNull();
  });

  it("finds the 18:00 peak window start ahead of the morning", () => {
    const boundary = nextBoundary(psPlan, FRI_MORNING, "double");
    expect(boundary?.toISOString()).toBe(new Date("2026-07-24T18:00:00+02:00").toISOString());
  });

  it("finds the window's end (past midnight) when already inside it", () => {
    const boundary = nextBoundary(psPlan, FRI_PEAK, "double");
    expect(boundary?.toISOString()).toBe(new Date("2026-07-25T00:00:00+02:00").toISOString());
  });
});

describe("billableUnits", () => {
  it("ceils 70 minutes at an hourly unit to 2 units", () => {
    expect(billableUnits(70 * 60_000, psPlan)).toBe(2);
  });

  it("enforces min_units above the naturally rounded value", () => {
    const highMinPlan: RatePlan = { ...psPlan, min_units: 2 };
    // 10 minutes ceils to 1 unit, but min_units=2 must win.
    expect(billableUnits(10 * 60_000, highMinPlan)).toBe(2);
  });
});

describe("priceSegment", () => {
  it("prices a closed segment from its own stored price_per_unit", () => {
    const seg = segment({ start: "2026-07-24T17:00:00+02:00", stop: "2026-07-24T18:10:00+02:00", price_per_unit: 30 });
    const priced = priceSegment(seg, psPlan);
    expect(priced.units).toBe(2); // ceil(70min / 60min)
    expect(priced.subtotal).toBe(60);
  });

  it("throws for an open segment (no stop to derive a duration from)", () => {
    const seg = segment({ stop: null });
    expect(() => priceSegment(seg, psPlan)).toThrow();
  });
});

describe("splitOnBoundary", () => {
  it("splits a segment crossing 18:00 into an off-peak piece and a peak piece", () => {
    const openSeg = segment({
      id: "seg_1",
      start: "2026-07-24T17:40:00+02:00",
      stop: null,
      rule_id: "off_double",
      price_per_unit: 45,
    });
    const now = new Date("2026-07-24T19:00:00+02:00");
    const pieces = splitOnBoundary(openSeg, psPlan, "double", now);

    expect(pieces).toHaveLength(2);
    expect(new Date(pieces[0].start).toISOString()).toBe(new Date("2026-07-24T17:40:00+02:00").toISOString());
    expect(pieces[0].stop && new Date(pieces[0].stop).toISOString()).toBe(new Date("2026-07-24T18:00:00+02:00").toISOString());
    expect(pieces[0].rule_id).toBe("off_double");
    expect(pieces[0].price_per_unit).toBe(45);

    expect(new Date(pieces[1].start).toISOString()).toBe(new Date("2026-07-24T18:00:00+02:00").toISOString());
    expect(pieces[1].stop).toBeNull();
    expect(pieces[1].rule_id).toBe("peak_double");
    expect(pieces[1].price_per_unit).toBe(60);
  });

  it("returns the segment unchanged (one piece) when no boundary is crossed", () => {
    const seg = segment({ start: "2026-07-24T10:00:00+02:00", stop: "2026-07-24T10:30:00+02:00", rule_id: "off_single", price_per_unit: 30 });
    const pieces = splitOnBoundary(seg, psPlan, "single");
    expect(pieces).toHaveLength(1);
    expect(pieces[0].rule_id).toBe("off_single");
  });
});

describe("sessionTotal", () => {
  it("excludes the gap of a paused-then-resumed session", () => {
    const ses = session({
      mode: "postpaid",
      state: "active",
      segments: [
        segment({ id: "seg_a", start: "2026-07-24T19:00:00+02:00", stop: "2026-07-24T19:35:00+02:00", rule_id: "bl_off", price_per_unit: 50 }),
        segment({ id: "seg_b", start: "2026-07-24T20:10:00+02:00", stop: "2026-07-24T20:40:00+02:00", rule_id: "bl_off", price_per_unit: 50 }),
      ],
    });
    const now = new Date("2026-07-24T21:00:00+02:00");
    const result = sessionTotal(ses, billiardPlan, now);

    // Each piece is 35min/30min → ceil to 1 hour unit each = 50 + 50, NOT the
    // 1h40 wall-clock span (19:00→20:40) which would ceil to 2 units = 100
    // only by coincidence; the real guard is that the 35min gap (19:35→20:10)
    // never enters either segment's own duration.
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].units).toBe(1);
    expect(result.segments[1].units).toBe(1);
    expect(result.timeTotal).toBe(100);
  });

  it("prices a transfer across device types using each segment's own plan", () => {
    // seg_a already closed on the billiard device+plan, with billing baked in
    // at close time (fixtures' pattern for finalized segments).
    const bakedSegA = segment({
      id: "seg_a",
      device_id: "dev_billiard_1",
      start: "2026-07-24T19:00:00+02:00",
      stop: "2026-07-24T19:35:00+02:00",
      rule_id: "bl_off",
      price_per_unit: 50,
      billable_units: 1,
      subtotal: 50,
    });
    // seg_b is the still-open segment on the target ping-pong device/plan.
    const openSegB = segment({
      id: "seg_b",
      device_id: "dev_pingpong_1",
      start: "2026-07-24T19:35:00+02:00",
      stop: null,
      rule_id: "pp_flat",
      price_per_unit: 25,
    });
    const ses = session({ segments: [bakedSegA, openSegB] });
    const now = new Date("2026-07-24T20:15:00+02:00"); // 40min on the ping-pong segment

    // Only the CURRENT (ping-pong) plan is passed — seg_a's baked numbers must
    // survive untouched even though they came from a different plan/unit.
    const result = sessionTotal(ses, pingpongPlan, now);

    expect(result.segments[0].subtotal).toBe(50); // untouched, from billiardPlan at close time
    expect(result.segments[1].units).toBe(2); // ceil(40min / 30m unit)
    expect(result.segments[1].subtotal).toBe(50);
    expect(result.timeTotal).toBe(100);
  });
});
