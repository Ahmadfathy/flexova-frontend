import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDeliveryNotes } from "@/lib/mock/wholesale";
import type { DeliveryNote } from "@/types/wholesale";

interface WholesaleDeliveryNotesState {
  notes: DeliveryNote[];
  addNote: (note: DeliveryNote) => void;
  updateNote: (id: string, patch: Partial<DeliveryNote>) => void;
  markInvoiced: (ids: string[], invoiceId: string) => void;
}

/** Live delivery-notes store, seeded from the fixture (FE_13 §6). */
export const useWholesaleDeliveryNotes = create<WholesaleDeliveryNotesState>()(
  persist(
    (set) => ({
      notes: getDeliveryNotes(),
      addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
      updateNote: (id, patch) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
      markInvoiced: (ids, invoiceId) =>
        set((s) => ({
          notes: s.notes.map((n) => (ids.includes(n.id) ? { ...n, invoice_id: invoiceId } : n)),
        })),
    }),
    { name: "flexova.wholesale.delivery_notes" },
  ),
);

/** Next sequential delivery-note number, following the "WH-DN-3301" convention. */
export function nextDeliveryNoteNumber(notes: DeliveryNote[]): string {
  const max = notes.reduce((m, n) => {
    const num = parseInt(n.number.replace(/\D/g, ""), 10);
    return isNaN(num) ? m : Math.max(m, num);
  }, 3300);
  return `WH-DN-${max + 1}`;
}
