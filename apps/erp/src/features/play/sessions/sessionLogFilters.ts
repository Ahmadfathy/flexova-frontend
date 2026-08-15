import type { Session } from "@/features/play/types";

/** Session log only ever lists CLOSED history (§9's own column set — "status (paid/cancelled)"
 * — never active/paused, those belong to the live Floor Grid). */
export function closedSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.state === "paid" || s.state === "cancelled");
}

/**
 * Row scope (§9 — "play.view + row scope: cashier sees own"). `canViewAll` is the caller's
 * already-resolved permission check (e.g. `can("play.view.all")`); when it's false, only
 * sessions this cashier personally opened are kept. A session with no `opened_by` (every
 * pre-seeded fixture session predates the field) is never attributable to anyone, so it's
 * shown regardless of scope rather than silently hidden from every scoped view.
 */
export function filterByRowScope(sessions: Session[], canViewAll: boolean, currentCashierId: string): Session[] {
  if (canViewAll) return sessions;
  return sessions.filter((s) => !s.opened_by || s.opened_by === currentCashierId);
}

export function sessionDateISO(session: Session): string | null {
  const first = session.segments[0];
  return first ? first.start : null;
}

export interface SessionLogFilterValues {
  dateFrom: string;
  dateTo: string;
  deviceTypeId: string;
  status: string;
  mode: string;
}

export function applySessionLogFilters(sessions: Session[], filters: SessionLogFilterValues): Session[] {
  let list = sessions;
  if (filters.dateFrom) {
    list = list.filter((s) => {
      const iso = sessionDateISO(s);
      return iso ? iso.slice(0, 10) >= filters.dateFrom : true;
    });
  }
  if (filters.dateTo) {
    list = list.filter((s) => {
      const iso = sessionDateISO(s);
      return iso ? iso.slice(0, 10) <= filters.dateTo : true;
    });
  }
  if (filters.deviceTypeId !== "all") list = list.filter((s) => s.device_type_id === filters.deviceTypeId);
  if (filters.status !== "all") list = list.filter((s) => s.state === filters.status);
  if (filters.mode !== "all") list = list.filter((s) => s.mode === filters.mode);
  return list;
}
