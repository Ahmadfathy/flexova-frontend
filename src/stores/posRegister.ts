import { create } from "zustand";
import { persist } from "zustand/middleware";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";

export interface PosCartLine {
  id: string;
  item_id: string;
  sku?: string;
  name: string;
  variant_label?: string;
  sold_by: "unit" | "weight";
  qty?: number;
  weight_kg?: number;
  price: number;
  uom_id: string;
  tax_type_id: string;
  line_discount: number;
  eta_code_missing: boolean;
}

const lineKey = (item_id: string, sku?: string) => `${item_id}:${sku ?? ""}`;

export interface PosCustomer {
  id: string;
  type: "individual" | "company";
  name_ar: string;
  name_en: string;
  credit_limit: number;
  ar_balance: number;
}

export interface ClosedTicketSummary {
  paymentStatus: "paid" | "credit";
  syncStatus: "local" | "queued";
  grandTotal: number;
  loyaltyEarned: number;
}

export interface ParkedTicket {
  id: string;
  number: string;
  parkedAt: string;
  lines: PosCartLine[];
  customer: PosCustomer | null;
  ticketDiscount: number;
}

const SEED_PARKED_TICKET = posFixtures.tickets.find(t => t.status === "parked");

const SEED_PARKED: ParkedTicket[] = SEED_PARKED_TICKET ? [{
  id: SEED_PARKED_TICKET.id,
  number: SEED_PARKED_TICKET.number,
  parkedAt: SEED_PARKED_TICKET.opened_at,
  customer: null,
  ticketDiscount: SEED_PARKED_TICKET.totals.ticket_discount,
  lines: SEED_PARKED_TICKET.lines.map(l => ({
    id: crypto.randomUUID(),
    item_id: l.item_id,
    sku: l.sku ?? undefined,
    name: l.description,
    sold_by: "weight_kg" in l ? "weight" : "unit",
    qty: "qty" in l ? l.qty : undefined,
    weight_kg: "weight_kg" in l ? l.weight_kg : undefined,
    price: ("price_per_kg" in l ? l.price_per_kg : l.price) ?? 0,
    uom_id: l.uom_id,
    tax_type_id: l.tax_type_id,
    line_discount: l.line_discount,
    eta_code_missing: "_flag" in l && l._flag === "eta_code_missing",
  })),
}] : [];

let parkedSeq = 5505;

interface PosRegisterState {
  category: string;
  searchQuery: string;
  lines: PosCartLine[];
  ticketDiscount: number;
  customer: PosCustomer | null;
  lastClosedTicket: ClosedTicketSummary | null;
  parkedTickets: ParkedTicket[];
  addUnitLine: (line: Omit<PosCartLine, "id" | "qty" | "weight_kg" | "sold_by">, qty?: number) => void;
  addWeightLine: (line: Omit<PosCartLine, "id" | "qty" | "weight_kg" | "sold_by">, weightKg: number) => void;
  updateQty: (id: string, qty: number) => void;
  updateWeight: (id: string, weightKg: number) => void;
  setLineDiscount: (id: string, amount: number) => void;
  removeLine: (id: string) => void;
  setTicketDiscount: (amount: number) => void;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setCustomer: (customer: PosCustomer | null) => void;
  clearTicket: () => void;
  closeTicket: (summary: ClosedTicketSummary) => void;
  parkTicket: () => void;
  retrieveTicket: (id: string) => void;
}

export const usePosRegister = create<PosRegisterState>()(
  persist(
    (set) => ({
      category: "all",
      searchQuery: "",
      lines: [],
      ticketDiscount: 0,
      customer: null,
      lastClosedTicket: null,
      parkedTickets: SEED_PARKED,

      addUnitLine: (line, qty = 1) => set((s) => {
        const key = lineKey(line.item_id, line.sku);
        const existing = s.lines.find(l => lineKey(l.item_id, l.sku) === key);
        if (existing) {
          return {
            lines: s.lines.map(l => l.id === existing.id ? { ...l, qty: (l.qty ?? 0) + qty } : l),
            lastClosedTicket: null,
          };
        }
        return { lines: [...s.lines, { ...line, id: crypto.randomUUID(), sold_by: "unit", qty }], lastClosedTicket: null };
      }),

      addWeightLine: (line, weightKg) => set((s) => {
        const key = lineKey(line.item_id, line.sku);
        const existing = s.lines.find(l => lineKey(l.item_id, l.sku) === key);
        if (existing) {
          return { lines: s.lines.map(l => l.id === existing.id ? { ...l, weight_kg: weightKg } : l), lastClosedTicket: null };
        }
        return { lines: [...s.lines, { ...line, id: crypto.randomUUID(), sold_by: "weight", weight_kg: weightKg }], lastClosedTicket: null };
      }),

      updateQty: (id, qty) => set((s) => ({
        lines: qty <= 0
          ? s.lines.filter(l => l.id !== id)
          : s.lines.map(l => (l.id === id ? { ...l, qty } : l)),
      })),

      updateWeight: (id, weightKg) => set((s) => ({
        lines: weightKg <= 0
          ? s.lines.filter(l => l.id !== id)
          : s.lines.map(l => (l.id === id ? { ...l, weight_kg: weightKg } : l)),
      })),

      setLineDiscount: (id, amount) => set((s) => ({
        lines: s.lines.map(l => (l.id === id ? { ...l, line_discount: Math.max(0, amount) } : l)),
      })),

      removeLine: (id) => set((s) => ({ lines: s.lines.filter(l => l.id !== id) })),

      setTicketDiscount: (amount) => set({ ticketDiscount: Math.max(0, amount) }),
      setCategory: (category) => set({ category }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setCustomer: (customer) => set({ customer }),
      clearTicket: () => set({ lines: [], ticketDiscount: 0, customer: null }),
      closeTicket: (summary) => set({ lines: [], ticketDiscount: 0, customer: null, lastClosedTicket: summary }),

      parkTicket: () => set((s) => {
        if (s.lines.length === 0) return s;
        const ticket: ParkedTicket = {
          id: crypto.randomUUID(),
          number: `${posFixtures.terminals[0].number_prefix}-${parkedSeq++}`,
          parkedAt: new Date().toISOString(),
          lines: s.lines,
          customer: s.customer,
          ticketDiscount: s.ticketDiscount,
        };
        return {
          parkedTickets: [ticket, ...s.parkedTickets],
          lines: [],
          ticketDiscount: 0,
          customer: null,
          lastClosedTicket: null,
        };
      }),

      retrieveTicket: (id) => set((s) => {
        const ticket = s.parkedTickets.find(p => p.id === id);
        if (!ticket) return s;
        return {
          lines: ticket.lines,
          customer: ticket.customer,
          ticketDiscount: ticket.ticketDiscount,
          lastClosedTicket: null,
          parkedTickets: s.parkedTickets.filter(p => p.id !== id),
        };
      }),
    }),
    { name: "flexova.pos.register" }
  )
);

export function cartQtyForItem(lines: PosCartLine[], itemId: string): number {
  return lines
    .filter(l => l.item_id === itemId && l.sold_by === "unit")
    .reduce((sum, l) => sum + (l.qty ?? 0), 0);
}

export function cartWeightForItem(lines: PosCartLine[], itemId: string): number | null {
  const line = lines.find(l => l.item_id === itemId && l.sold_by === "weight");
  return line ? (line.weight_kg ?? null) : null;
}
