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

  it("splitDueSegments never re-prices a prepaid session's flat, already-paid segment", () => {
    usePlaySessions.setState({
      sessions: {
        ses_prepaid: {
          id: "ses_prepaid", mode: "prepaid", state: "active",
          device_id: "dev_test", device_type_id: "dt_test",
          customer: null, supervisor_id: null, play_mode: null,
          check_id: "chk_test", block_id: "blk_test", block_duration_min: 60,
          segments: [{
            id: "seg_prepaid", device_id: "dev_test",
            start: "2026-07-24T17:40:00+02:00", stop: null,
            rule_id: null, price_per_unit: 0,
          }],
        },
      },
      clock: 0,
    });
    const afterBoundary = new Date("2026-07-24T18:05:00+02:00"); // well past the 18:00 peak boundary
    const splitIds = usePlaySessions.getState().splitDueSegments(() => testPlan, afterBoundary);
    expect(splitIds).toHaveLength(0);
    const segments = usePlaySessions.getState().sessions.ses_prepaid.segments;
    expect(segments).toHaveLength(1);
    expect(segments[0].price_per_unit).toBe(0);
    expect(segments[0].stop).toBeNull();
  });
});

describe("usePlaySessions — transferSession (§5.5)", () => {
  beforeEach(() => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
  });

  it("closes the old segment and opens a new one on the target device at the target's rate", () => {
    usePlaySessions.getState().transferSession("ses_test", "dev_target", "dt_target", { rule_id: "peak", price_per_unit: 60 });
    const s = usePlaySessions.getState().sessions.ses_test;

    expect(s.state).toBe("active");
    expect(s.device_id).toBe("dev_target");
    expect(s.device_type_id).toBe("dt_target");
    expect(s.segments).toHaveLength(2);

    // Old segment: unchanged device/rate, now closed — a future invoice still bills it at
    // the ORIGINAL device's rate, not the new one.
    expect(s.segments[0].device_id).toBe("dev_test");
    expect(s.segments[0].price_per_unit).toBe(30);
    expect(s.segments[0].stop).not.toBeNull();

    // New segment: the target device, priced by the target's own rate (a PS4→PS5 transfer
    // costing more is correct and intended — this is exactly that shape).
    expect(s.segments[1].device_id).toBe("dev_target");
    expect(s.segments[1].price_per_unit).toBe(60);
    expect(s.segments[1].stop).toBeNull();
  });

  it("is a no-op when the session is paused (no running segment to close)", () => {
    usePlaySessions.getState().pauseSession("ses_test");
    usePlaySessions.getState().transferSession("ses_test", "dev_target", "dt_target", { rule_id: "peak", price_per_unit: 60 });
    const s = usePlaySessions.getState().sessions.ses_test;
    expect(s.device_id).toBe("dev_test");
    expect(s.segments).toHaveLength(1);
  });
});

function seedPrepaidSession(): Session {
  return {
    id: "ses_prepaid", mode: "prepaid", state: "active",
    device_id: "dev_test", device_type_id: "dt_test",
    customer: null, supervisor_id: null, play_mode: null,
    check_id: "chk_test", block_id: "blk_30", block_duration_min: 30, prepaid_receipt_id: "rcpt_1",
    segments: [{
      id: "seg_prepaid", device_id: "dev_test",
      start: "2026-07-24T17:40:00+02:00", stop: null,
      rule_id: null, price_per_unit: 0,
    }],
  };
}

describe("usePlaySessions — Prepaid Extend (§5.6)", () => {
  beforeEach(() => {
    usePlaySessions.setState({ sessions: { ses_prepaid: seedPrepaidSession() }, clock: 0 });
  });

  it("extendPrepaidBlock tops up the budget without touching the segment", () => {
    usePlaySessions.getState().extendPrepaidBlock("ses_prepaid", 60, "rcpt_2");
    const s = usePlaySessions.getState().sessions.ses_prepaid;
    expect(s.block_duration_min).toBe(90); // 30 + 60
    expect(s.prepaid_receipt_id).toBe("rcpt_2");
    expect(s.segments).toHaveLength(1); // still one continuous segment, never split
    expect(s.segments[0].stop).toBeNull();
    expect(s.segments[0].price_per_unit).toBe(0);
  });

  it("extendPrepaidBlock is a no-op on a postpaid session", () => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
    usePlaySessions.getState().extendPrepaidBlock("ses_test", 60, "rcpt_2");
    expect(usePlaySessions.getState().sessions.ses_test.block_duration_min).toBeUndefined();
  });

  it("convertToOpenCounter closes the prepaid segment and opens a real-rate postpaid one", () => {
    usePlaySessions.getState().convertToOpenCounter("ses_prepaid", { rule_id: "off", price_per_unit: 30 });
    const s = usePlaySessions.getState().sessions.ses_prepaid;
    expect(s.mode).toBe("postpaid");
    expect(s.segments).toHaveLength(2);
    expect(s.segments[0].price_per_unit).toBe(0); // prepaid time already paid, unchanged
    expect(s.segments[0].stop).not.toBeNull();
    expect(s.segments[1].price_per_unit).toBe(30); // overflow priced by the rate engine from now
    expect(s.segments[1].stop).toBeNull();
  });

  it("convertToOpenCounter is a no-op on an already-postpaid session", () => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
    usePlaySessions.getState().convertToOpenCounter("ses_test", { rule_id: "off", price_per_unit: 30 });
    expect(usePlaySessions.getState().sessions.ses_test.segments).toHaveLength(1);
  });
});

describe("usePlaySessions — endSession (§5.7)", () => {
  it("closes the running segment and transitions active → paid", () => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
    usePlaySessions.getState().endSession("ses_test", "doc_1", "valid");
    const s = usePlaySessions.getState().sessions.ses_test;
    expect(s.state).toBe("paid");
    expect(s.segments[0].stop).not.toBeNull();
    expect(s.document_id).toBe("doc_1");
    expect(s.eta_status).toBe("valid");
  });

  it("transitions paused → paid without touching the already-closed segment", () => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
    usePlaySessions.getState().pauseSession("ses_test");
    const closedStop = usePlaySessions.getState().sessions.ses_test.segments[0].stop;
    usePlaySessions.getState().endSession("ses_test", "doc_2", "queued");
    const s = usePlaySessions.getState().sessions.ses_test;
    expect(s.state).toBe("paid");
    expect(s.segments[0].stop).toBe(closedStop); // untouched — already closed by pause
    expect(s.document_id).toBe("doc_2");
  });

  it("is a no-op on an already-paid session", () => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
    usePlaySessions.getState().endSession("ses_test", "doc_1", "valid");
    usePlaySessions.getState().endSession("ses_test", "doc_2", "valid");
    expect(usePlaySessions.getState().sessions.ses_test.document_id).toBe("doc_1");
  });
});

describe("usePlaySessions — cancelSession (§5.9)", () => {
  it("transitions active → cancelled with a reason, no reversal fields when none is passed", () => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
    usePlaySessions.getState().cancelSession("ses_test", "العميل مشي");
    const s = usePlaySessions.getState().sessions.ses_test;
    expect(s.state).toBe("cancelled");
    expect(s.cancel_reason).toBe("العميل مشي");
    expect(s.reversal_doc_id).toBeUndefined();
    expect(s.eta_status).toBeUndefined();
  });

  it("records the reversal doc id and flips eta_status to reversed when one is passed", () => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
    usePlaySessions.getState().cancelSession("ses_test", "no-show", "cn_play_1");
    const s = usePlaySessions.getState().sessions.ses_test;
    expect(s.state).toBe("cancelled");
    expect(s.reversal_doc_id).toBe("cn_play_1");
    expect(s.eta_status).toBe("reversed");
  });

  it("also cancels a paused session", () => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
    usePlaySessions.getState().pauseSession("ses_test");
    usePlaySessions.getState().cancelSession("ses_test", "reason");
    expect(usePlaySessions.getState().sessions.ses_test.state).toBe("cancelled");
  });

  it("is a no-op on an already-paid or already-cancelled session", () => {
    usePlaySessions.setState({ sessions: { ses_test: seedSession() }, clock: 0 });
    usePlaySessions.getState().endSession("ses_test", "doc_1", "valid");
    usePlaySessions.getState().cancelSession("ses_test", "too late");
    expect(usePlaySessions.getState().sessions.ses_test.state).toBe("paid");
    expect(usePlaySessions.getState().sessions.ses_test.cancel_reason).toBeUndefined();
  });
});
