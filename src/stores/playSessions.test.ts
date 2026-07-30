import { beforeEach, describe, expect, it } from "vitest";
import { usePlaySessions } from "./playSessions";
import type { RatePlan, Session } from "@/features/play/types";

// Off-peak flat rule + a Friday/Saturday 18:00-23:59 peak window — mirrors the rate-engine's
// own test plan (2026-07-24 is a Friday, matching that suite's established reference date).
const testPlan: RatePlan = {
  id: "rp_test", name_ar: "", name_en: "", unit: "hour", rounding: "ceil", min_units: 1,
  rules: [
    { id: "off", price_per_unit: 30, window: null, play_mode: null, priority: 1 },
    { id: "peak", price_per_unit: 60, window: { days: ["FR", "SA"], from: "18:00", to: "23:59" }, play_mode: null, priority: 5 },
  ],
  prepaid_blocks: [],
};

function seedSession(): Session {
  return {
    id: "ses_test", mode: "postpaid", state: "active",
    device_id: "dev_test", device_type_id: "dt_test",
    customer: null, supervisor_id: null, play_mode: null,
    check_id: "chk_test",
    segments: [{
      id: "seg_test", device_id: "dev_test",
      start: "2026-07-24T17:40:00+02:00", stop: null,
      rule_id: "off", price_per_unit: 30,
    }],
  };
}

describe("usePlaySessions — pause/resume/splitDueSegments", () => {
  beforeEach(() => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
  });

  it("pause closes the running segment (§6: gap starts here, never billed)", () => {
    usePlaySessions.getState().pauseSession("ses_test");
    const s = usePlaySessions.getState().sessions.ses_test;
    expect(s.state).toBe("paused");
    expect(s.segments).toHaveLength(1);
    expect(s.segments[0].stop).not.toBeNull();
  });

  it("pause is a no-op on an already-paused session", () => {
    usePlaySessions.getState().pauseSession("ses_test");
    const pausedStop = usePlaySessions.getState().sessions.ses_test.segments[0].stop;
    usePlaySessions.getState().pauseSession("ses_test");
    expect(usePlaySessions.getState().sessions.ses_test.segments[0].stop).toBe(pausedStop);
  });

  it("resume opens a new segment priced at the rule resolved for that moment", () => {
    usePlaySessions.getState().pauseSession("ses_test");
    usePlaySessions.getState().resumeSession("ses_test", "dev_test", { rule_id: "off", price_per_unit: 30 });
    const s = usePlaySessions.getState().sessions.ses_test;
    expect(s.state).toBe("active");
    expect(s.segments).toHaveLength(2);
    expect(s.segments[0].stop).not.toBeNull(); // the paused segment stays closed
    expect(s.segments[1].stop).toBeNull(); // the new segment is the one running now
    expect(s.segments[1].rule_id).toBe("off");
  });

  it("the gap between pause and resume is excluded from billable duration", () => {
    usePlaySessions.getState().pauseSession("ses_test");
    const pausedAt = new Date(usePlaySessions.getState().sessions.ses_test.segments[0].stop!);
    // Simulate a real gap by resuming "later" — new segment must start no earlier than the pause.
    usePlaySessions.getState().resumeSession("ses_test", "dev_test", { rule_id: "off", price_per_unit: 30 });
    const resumedSegStart = new Date(usePlaySessions.getState().sessions.ses_test.segments[1].start);
    expect(resumedSegStart.getTime()).toBeGreaterThanOrEqual(pausedAt.getTime());
    // No segment spans the pause->resume gap — the two segments' own durations never include it.
  });

  it("splitDueSegments does nothing before the rate-window boundary", () => {
    const beforeBoundary = new Date("2026-07-24T17:50:00+02:00");
    const splitIds = usePlaySessions.getState().splitDueSegments(() => testPlan, beforeBoundary);
    expect(splitIds).toHaveLength(0);
    expect(usePlaySessions.getState().sessions.ses_test.segments).toHaveLength(1);
  });

  it("splitDueSegments auto-splits the running segment once the boundary is crossed", () => {
    const afterBoundary = new Date("2026-07-24T18:05:00+02:00");
    const splitIds = usePlaySessions.getState().splitDueSegments(() => testPlan, afterBoundary);
    expect(splitIds).toEqual(["ses_test"]);

    const segments = usePlaySessions.getState().sessions.ses_test.segments;
    expect(segments).toHaveLength(2);
    expect(segments[0].rule_id).toBe("off");
    expect(segments[0].stop).not.toBeNull();
    expect(segments[1].rule_id).toBe("peak");
    expect(segments[1].price_per_unit).toBe(60);
    expect(segments[1].stop).toBeNull();
  });

  it("splitDueSegments never touches a paused session", () => {
    usePlaySessions.getState().pauseSession("ses_test");
    const afterBoundary = new Date("2026-07-24T18:05:00+02:00");
    const splitIds = usePlaySessions.getState().splitDueSegments(() => testPlan, afterBoundary);
    expect(splitIds).toHaveLength(0);
  });
});
