import { create } from "zustand";
import { persist } from "zustand/middleware";
import svcFixtures from "@/lib/mock/fixtures/svc.fixtures.json";
import type { SvcAppointment } from "@/stores/svcAppointments";
import { findService } from "@/features/svc/catalog";

export type SvcTicketLineType = "service" | "product";

export interface SvcTicketLine {
  id: string;
  type: SvcTicketLineType;
  ref: string;
  name: string;
  /** Services only — null for product lines and for services still awaiting a provider pick. */
  provider_id: string | null;
  qty: number;
  price: number;
  tax_type_id: string;
  line_discount: number;
  package_covered: boolean;
  package_id?: string;
  eta_code_missing: boolean;
}

export interface SvcTicketTender {
  type: string;
  amount: number;
}

export interface SvcTicketCommission {
  provider_id: string;
  base: number;
  pct: number;
  amount: number;
  on: "collected";
}

export interface SvcTicketEta {
  uuid?: string;
  accepted_at?: string;
  qr?: string;
  environment?: string;
  queued_at?: string;
  window_deadline?: string;
  window_remaining_hours?: number;
  rejected_at?: string;
  reason_ar?: string;
  reason_en?: string;
}

export interface SvcTicketTotals {
  subtotal: number;
  discount: number;
  taxable_base: number;
  tax: number;
  rounding: number;
  grand_total: number;
}

export type TicketStatus = "open" | "settled";
export type TicketPaymentStatus = "unpaid" | "paid" | "partial";
export type TicketSyncStatus = "local" | "queued" | "valid" | "rejected";
export type TicketChannel = "e-receipt" | "e-invoice";

export interface SvcServiceTicket {
  id: string;
  number: string;
  appointment_id: string;
  client_id: string;
  walk_in_name?: string;
  branch_id: string;
  shift_id: string;
  status: TicketStatus;
  payment_status: TicketPaymentStatus;
  sync_status: TicketSyncStatus;
  channel: TicketChannel;
  lines: SvcTicketLine[];
  ticket_discount: number;
  totals: SvcTicketTotals;
  tenders: SvcTicketTender[];
  change_due: number;
  commission: SvcTicketCommission[];
  eta?: SvcTicketEta;
}

interface FixtureTicketLine {
  type: SvcTicketLineType;
  ref: string;
  name: string;
  provider_id: string | null;
  qty: number;
  price: number;
  line_total: number;
}

interface FixtureTicket {
  id: string;
  number: string;
  appointment_id: string;
  client_id: string;
  branch_id: string;
  shift_id: string;
  status: string;
  payment_status: string;
  sync_status: string;
  lines: FixtureTicketLine[];
  totals: SvcTicketTotals;
  tenders: SvcTicketTender[];
  change_due: number;
  commission: SvcTicketCommission[];
  eta?: SvcTicketEta;
}

const SEED_TICKETS = (svcFixtures.service_tickets as FixtureTicket[]).reduce<Record<string, SvcServiceTicket>>(
  (acc, t) => {
    acc[t.id] = {
      id: t.id,
      number: t.number,
      appointment_id: t.appointment_id,
      client_id: t.client_id,
      branch_id: t.branch_id,
      shift_id: t.shift_id,
      status: t.status as TicketStatus,
      payment_status: t.payment_status as TicketPaymentStatus,
      sync_status: t.sync_status as TicketSyncStatus,
      channel: "e-receipt",
      lines: t.lines.map((l) => ({
        id: crypto.randomUUID(),
        type: l.type,
        ref: l.ref,
        name: l.name,
        provider_id: l.provider_id,
        qty: l.qty,
        price: l.price,
        tax_type_id: "tax_t1",
        line_discount: 0,
        package_covered: false,
        eta_code_missing: false,
      })),
      ticket_discount: 0,
      totals: t.totals,
      tenders: t.tenders,
      change_due: t.change_due,
      commission: t.commission,
      eta: t.eta,
    };
    return acc;
  },
  {}
);

let ticketSeq = 1;

function lineFromService(serviceId: string, providerId: string | null, opts?: { covered?: boolean; packageId?: string }): SvcTicketLine {
  const svc = findService(serviceId);
  return {
    id: crypto.randomUUID(),
    type: "service",
    ref: serviceId,
    name: svc ? svc.name_ar : serviceId,
    provider_id: providerId,
    qty: 1,
    price: svc?.price ?? 0,
    tax_type_id: svc?.tax_type_id ?? "tax_t1",
    line_discount: 0,
    package_covered: !!opts?.covered,
    package_id: opts?.packageId,
    eta_code_missing: svc?.eta_code === "",
  };
}

interface SvcTicketsState {
  tickets: Record<string, SvcServiceTicket>;
  /** Builds (once) the open ticket for a just-completed appointment — no-op if it already exists. */
  ensureTicketFromAppointment: (ticketId: string, appointment: SvcAppointment) => void;
  addServiceLine: (ticketId: string, serviceId: string) => void;
  addProductLine: (ticketId: string, product: { item_id: string; name: string; price: number; tax_type_id: string; eta_code_missing: boolean }, qty?: number) => void;
  setLineProvider: (ticketId: string, lineId: string, providerId: string) => void;
  setLineQty: (ticketId: string, lineId: string, qty: number) => void;
  removeLine: (ticketId: string, lineId: string) => void;
  setTicketDiscount: (ticketId: string, amount: number) => void;
  settleTicket: (
    ticketId: string,
    patch: {
      tenders: SvcTicketTender[];
      changeDue: number;
      paymentStatus: TicketPaymentStatus;
      syncStatus: TicketSyncStatus;
      channel: TicketChannel;
      commission: SvcTicketCommission[];
      eta?: SvcTicketEta;
      totals: SvcTicketTotals;
    }
  ) => void;
}

export const useSvcTickets = create<SvcTicketsState>()(
  persist(
    (set, get) => ({
      tickets: SEED_TICKETS,

      ensureTicketFromAppointment: (ticketId, appointment) => {
        if (get().tickets[ticketId]) return;

        const lines = appointment.services.map((serviceId, i) =>
          lineFromService(
            serviceId,
            appointment.provider_id,
            i === 0 && appointment.package_covered ? { covered: true, packageId: appointment.package_id } : undefined
          )
        );

        const ticket: SvcServiceTicket = {
          id: ticketId,
          number: `SVC-T-${1000 + ticketSeq++}`,
          appointment_id: appointment.id,
          client_id: appointment.client_id,
          walk_in_name: appointment.walk_in_name,
          branch_id: appointment.branch_id,
          shift_id: "sh_open_main",
          status: "open",
          payment_status: "unpaid",
          sync_status: "local",
          channel: "e-receipt",
          lines,
          ticket_discount: 0,
          totals: { subtotal: 0, discount: 0, taxable_base: 0, tax: 0, rounding: 0, grand_total: 0 },
          tenders: [],
          change_due: 0,
          commission: [],
        };

        set((s) => ({ tickets: { ...s.tickets, [ticketId]: ticket } }));
      },

      addServiceLine: (ticketId, serviceId) => {
        set((s) => {
          const ticket = s.tickets[ticketId];
          if (!ticket || ticket.status !== "open") return s;
          return { tickets: { ...s.tickets, [ticketId]: { ...ticket, lines: [...ticket.lines, lineFromService(serviceId, null)] } } };
        });
      },

      addProductLine: (ticketId, product, qty = 1) => {
        set((s) => {
          const ticket = s.tickets[ticketId];
          if (!ticket || ticket.status !== "open") return s;
          const existing = ticket.lines.find((l) => l.type === "product" && l.ref === product.item_id);
          const lines = existing
            ? ticket.lines.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + qty } : l))
            : [
                ...ticket.lines,
                {
                  id: crypto.randomUUID(),
                  type: "product" as const,
                  ref: product.item_id,
                  name: product.name,
                  provider_id: null,
                  qty,
                  price: product.price,
                  tax_type_id: product.tax_type_id,
                  line_discount: 0,
                  package_covered: false,
                  eta_code_missing: product.eta_code_missing,
                },
              ];
          return { tickets: { ...s.tickets, [ticketId]: { ...ticket, lines } } };
        });
      },

      setLineProvider: (ticketId, lineId, providerId) => {
        set((s) => {
          const ticket = s.tickets[ticketId];
          if (!ticket || ticket.status !== "open") return s;
          return {
            tickets: {
              ...s.tickets,
              [ticketId]: { ...ticket, lines: ticket.lines.map((l) => (l.id === lineId ? { ...l, provider_id: providerId } : l)) },
            },
          };
        });
      },

      setLineQty: (ticketId, lineId, qty) => {
        set((s) => {
          const ticket = s.tickets[ticketId];
          if (!ticket || ticket.status !== "open") return s;
          const lines = qty <= 0 ? ticket.lines.filter((l) => l.id !== lineId) : ticket.lines.map((l) => (l.id === lineId ? { ...l, qty } : l));
          return { tickets: { ...s.tickets, [ticketId]: { ...ticket, lines } } };
        });
      },

      removeLine: (ticketId, lineId) => {
        set((s) => {
          const ticket = s.tickets[ticketId];
          if (!ticket || ticket.status !== "open") return s;
          return { tickets: { ...s.tickets, [ticketId]: { ...ticket, lines: ticket.lines.filter((l) => l.id !== lineId) } } };
        });
      },

      setTicketDiscount: (ticketId, amount) => {
        set((s) => {
          const ticket = s.tickets[ticketId];
          if (!ticket || ticket.status !== "open") return s;
          return { tickets: { ...s.tickets, [ticketId]: { ...ticket, ticket_discount: Math.max(0, amount) } } };
        });
      },

      settleTicket: (ticketId, patch) => {
        set((s) => {
          const ticket = s.tickets[ticketId];
          if (!ticket) return s;
          return {
            tickets: {
              ...s.tickets,
              [ticketId]: {
                ...ticket,
                status: "settled",
                payment_status: patch.paymentStatus,
                sync_status: patch.syncStatus,
                channel: patch.channel,
                tenders: patch.tenders,
                change_due: patch.changeDue,
                commission: patch.commission,
                eta: patch.eta,
                totals: patch.totals,
              },
            },
          };
        });
      },
    }),
    { name: "flexova.svc.tickets" }
  )
);
