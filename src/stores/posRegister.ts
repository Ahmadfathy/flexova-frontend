import { create } from "zustand";
import { persist } from "zustand/middleware";

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

interface PosRegisterState {
  category: string;
  searchQuery: string;
  lines: PosCartLine[];
  ticketDiscount: number;
  addUnitLine: (line: Omit<PosCartLine, "id" | "qty" | "weight_kg" | "sold_by">, qty?: number) => void;
  addWeightLine: (line: Omit<PosCartLine, "id" | "qty" | "weight_kg" | "sold_by">, weightKg: number) => void;
  updateQty: (id: string, qty: number) => void;
  updateWeight: (id: string, weightKg: number) => void;
  setLineDiscount: (id: string, amount: number) => void;
  removeLine: (id: string) => void;
  setTicketDiscount: (amount: number) => void;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  clearTicket: () => void;
}

export const usePosRegister = create<PosRegisterState>()(
  persist(
    (set) => ({
      category: "all",
      searchQuery: "",
      lines: [],
      ticketDiscount: 0,

      addUnitLine: (line, qty = 1) => set((s) => {
        const key = lineKey(line.item_id, line.sku);
        const existing = s.lines.find(l => lineKey(l.item_id, l.sku) === key);
        if (existing) {
          return {
            lines: s.lines.map(l => l.id === existing.id ? { ...l, qty: (l.qty ?? 0) + qty } : l),
          };
        }
        return { lines: [...s.lines, { ...line, id: crypto.randomUUID(), sold_by: "unit", qty }] };
      }),

      addWeightLine: (line, weightKg) => set((s) => {
        const key = lineKey(line.item_id, line.sku);
        const existing = s.lines.find(l => lineKey(l.item_id, l.sku) === key);
        if (existing) {
          return { lines: s.lines.map(l => l.id === existing.id ? { ...l, weight_kg: weightKg } : l) };
        }
        return { lines: [...s.lines, { ...line, id: crypto.randomUUID(), sold_by: "weight", weight_kg: weightKg }] };
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
      clearTicket: () => set({ lines: [], ticketDiscount: 0 }),
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
