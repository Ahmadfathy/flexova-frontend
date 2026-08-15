import { describe, expect, it } from "vitest";
import {
  applySessionLogFilters, closedSessions, filterByRowScope,
} from "./sessionLogFilters";
import type { Session } from "@/features/play/types";

function makeSession(overrides: Partial<Session>): Session {
  return {
    id: "ses_x", mode: "postpaid", state: "paid",
    device_id: "dev_1", device_type_id: "dt_1",
    customer: null, supervisor_id: null, play_mode: null,
    check_id: "chk_1",
    segments: [{ id: "seg_1", device_id: "dev_1", start: "2026-07-24T10:00:00+02:00", stop: "2026-07-24T11:00:00+02:00", rule_id: "r1", price_per_unit: 30 }],
    ...overrides,
  };
}

describe("closedSessions", () => {
  it("keeps only paid/cancelled, drops active/paused", () => {
    const list = [
      makeSession({ id: "a", state: "paid" }),
      makeSession({ id: "b", state: "cancelled" }),
      makeSession({ id: "c", state: "active" }),
      makeSession({ id: "d", state: "paused" }),
    ];
    expect(closedSessions(list).map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("filterByRowScope (§9 — cashier sees own)", () => {
  const sessions = [
    makeSession({ id: "mine", opened_by: "emp_hassan" }),
    makeSession({ id: "theirs", opened_by: "emp_sara" }),
    makeSession({ id: "unattributed" }), // no opened_by — pre-seeded fixture data
  ];

  it("returns everything when the caller can view all", () => {
    expect(filterByRowScope(sessions, true, "emp_hassan").map((s) => s.id)).toEqual(["mine", "theirs", "unattributed"]);
  });

  it("keeps only own + unattributed sessions when scoped to own", () => {
    expect(filterByRowScope(sessions, false, "emp_hassan").map((s) => s.id)).toEqual(["mine", "unattributed"]);
  });
});

describe("applySessionLogFilters", () => {
  const sessions = [
    makeSession({ id: "a", device_type_id: "dt_ps5", mode: "postpaid", state: "paid", segments: [{ id: "s", device_id: "d", start: "2026-07-20T10:00:00+02:00", stop: "2026-07-20T11:00:00+02:00", rule_id: "r", price_per_unit: 30 }] }),
    makeSession({ id: "b", device_type_id: "dt_ps4", mode: "prepaid", state: "cancelled", segments: [{ id: "s", device_id: "d", start: "2026-07-25T10:00:00+02:00", stop: "2026-07-25T11:00:00+02:00", rule_id: "r", price_per_unit: 30 }] }),
  ];

  it("filters by date range (inclusive)", () => {
    expect(applySessionLogFilters(sessions, { dateFrom: "2026-07-22", dateTo: "", deviceTypeId: "all", status: "all", mode: "all" }).map((s) => s.id)).toEqual(["b"]);
    expect(applySessionLogFilters(sessions, { dateFrom: "", dateTo: "2026-07-22", deviceTypeId: "all", status: "all", mode: "all" }).map((s) => s.id)).toEqual(["a"]);
  });

  it("filters by device type", () => {
    expect(applySessionLogFilters(sessions, { dateFrom: "", dateTo: "", deviceTypeId: "dt_ps4", status: "all", mode: "all" }).map((s) => s.id)).toEqual(["b"]);
  });

  it("filters by status and mode", () => {
    expect(applySessionLogFilters(sessions, { dateFrom: "", dateTo: "", deviceTypeId: "all", status: "cancelled", mode: "all" }).map((s) => s.id)).toEqual(["b"]);
    expect(applySessionLogFilters(sessions, { dateFrom: "", dateTo: "", deviceTypeId: "all", status: "all", mode: "prepaid" }).map((s) => s.id)).toEqual(["b"]);
  });
});
