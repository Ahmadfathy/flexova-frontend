import { create } from "zustand";
import { persist } from "zustand/middleware";
import fnbFixtures from "@/lib/mock/fixtures/fnb.fixtures.json";
import type { FnbLineModifier, FnbOrderType } from "./fnbOrder";

export type KdsTicketStatus = "new" | "preparing" | "ready";

export interface KdsTicketItem {
  line_id: string;
  item_id: string;
  qty: number;
  modifiers: FnbLineModifier[];
}

export interface KdsTicket {
  id: string;
  check_id: string;
  check_number: string;
  order_type: FnbOrderType;
  table_number: string | null;
  station_id: string;
  course_id: string;
  fired_at: string;
  status: KdsTicketStatus;
  elapsed_seconds: number;
  items: KdsTicketItem[];
}

interface RawFixtureLine { id: string; item_id: string; qty: number; modifiers: FnbLineModifier[]; }
interface RawFixtureCheck { id: string; type: FnbOrderType; table_id: string | null; lines: RawFixtureLine[]; }
interface RawTable { id: string; number: string; }
interface FixtureKotItem { line_id: string; timer_seconds: number; }
interface FixtureKot {
  id: string; check_id: string; check_number: string;
  station_id: string; course_id: string; fired_at: string; status: string;
  items: FixtureKotItem[];
}

const RAW_CHECKS = fnbFixtures.checks as unknown as RawFixtureCheck[];
const RAW_TABLES = fnbFixtures.tables as RawTable[];

const LINE_LOOKUP = new Map<string, RawFixtureLine>();
for (const c of RAW_CHECKS) for (const l of c.lines) LINE_LOOKUP.set(l.id, l);

function tableNumberFor(tableId: string | null): string | null {
  if (!tableId) return null;
  return RAW_TABLES.find(t => t.id === tableId)?.number ?? null;
}

function seedTicket(kot: FixtureKot): KdsTicket {
  const check = RAW_CHECKS.find(c => c.id === kot.check_id);
  const items: KdsTicketItem[] = kot.items.map(it => {
    const line = LINE_LOOKUP.get(it.line_id);
    return { line_id: it.line_id, item_id: line?.item_id ?? "", qty: line?.qty ?? 1, modifiers: line?.modifiers ?? [] };
  });
  return {
    id: kot.id,
    check_id: kot.check_id,
    check_number: kot.check_number,
    order_type: check?.type ?? "dine-in",
    table_number: tableNumberFor(check?.table_id ?? null),
    station_id: kot.station_id,
    course_id: kot.course_id,
    fired_at: kot.fired_at,
    status: kot.status as KdsTicketStatus,
    elapsed_seconds: Math.max(0, ...kot.items.map(i => i.timer_seconds), 0),
    items,
  };
}

const SEED_TICKETS: Record<string, KdsTicket> = Object.fromEntries(
  (fnbFixtures.kot_tickets as FixtureKot[]).map(k => [k.id, seedTicket(k)])
);

interface CreateTicketsParams {
  check_id: string;
  check_number: string;
  order_type: FnbOrderType;
  table_number: string | null;
  lines: { id: string; item_id: string; qty: number; modifiers: FnbLineModifier[]; course_id: string; station_id: string }[];
}

interface FnbKdsState {
  tickets: Record<string, KdsTicket>;

  /** Groups newly-fired lines into one ticket per (station, course) and adds them to the board. */
  createTicketsFromFire: (params: CreateTicketsParams) => void;
  /** new/preparing → preparing (kitchen acknowledges the ticket). */
  start: (ticketId: string) => void;
  /** → ready. Caller also syncs the underlying check lines to `ready` via `useFnbOrder`. */
  bump: (ticketId: string) => void;
  /** ready → preparing (undo bump). Caller also reverts the underlying check lines. */
  recall: (ticketId: string) => void;
  /** Advances every non-ready ticket's elapsed timer by one second. */
  tick: () => void;
}

export const useFnbKds = create<FnbKdsState>()(
  persist(
    (set) => ({
      tickets: SEED_TICKETS,

      createTicketsFromFire: ({ check_id, check_number, order_type, table_number, lines }) => set((s) => {
        const groups = new Map<string, typeof lines>();
        for (const line of lines) {
          const key = `${line.station_id}::${line.course_id}`;
          const group = groups.get(key) ?? [];
          group.push(line);
          groups.set(key, group);
        }
        const now = new Date().toISOString();
        const newTickets: Record<string, KdsTicket> = {};
        for (const [key, group] of groups) {
          const [station_id, course_id] = key.split("::");
          const id = `kot_${Date.now()}_${station_id}`;
          newTickets[id] = {
            id,
            check_id,
            check_number,
            order_type,
            table_number,
            station_id,
            course_id,
            fired_at: now,
            status: "new",
            elapsed_seconds: 0,
            items: group.map(l => ({ line_id: l.id, item_id: l.item_id, qty: l.qty, modifiers: l.modifiers })),
          };
        }
        return { tickets: { ...s.tickets, ...newTickets } };
      }),

      start: (ticketId) => set((s) => {
        const ticket = s.tickets[ticketId];
        if (!ticket || ticket.status !== "new") return s;
        return { tickets: { ...s.tickets, [ticketId]: { ...ticket, status: "preparing" } } };
      }),

      bump: (ticketId) => set((s) => {
        const ticket = s.tickets[ticketId];
        if (!ticket) return s;
        return { tickets: { ...s.tickets, [ticketId]: { ...ticket, status: "ready" } } };
      }),

      recall: (ticketId) => set((s) => {
        const ticket = s.tickets[ticketId];
        if (!ticket || ticket.status !== "ready") return s;
        return { tickets: { ...s.tickets, [ticketId]: { ...ticket, status: "preparing" } } };
      }),

      tick: () => set((s) => {
        const tickets: Record<string, KdsTicket> = {};
        for (const [id, ticket] of Object.entries(s.tickets)) {
          tickets[id] = ticket.status === "ready" ? ticket : { ...ticket, elapsed_seconds: ticket.elapsed_seconds + 1 };
        }
        return { tickets };
      }),
    }),
    { name: "flexova.fnb.kds" }
  )
);
