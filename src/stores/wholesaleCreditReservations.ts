import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getCreditReservations } from "@/lib/mock/wholesale";
import type { CreditReservation } from "@/types/wholesale";

interface WholesaleCreditReservationsState {
  reservations: CreditReservation[];
  addReservation: (r: { customer_id: string; order_id: string; amount: number }) => CreditReservation;
  releaseReservation: (id: string) => void;
}

/** Live credit-reservations store, seeded from the fixture. Order approval (FE_13
 * §5) writes here; useCreditGuard and the credit hub both read from here so a
 * newly-reserved amount is immediately reflected in available-credit checks. */
export const useWholesaleCreditReservations = create<WholesaleCreditReservationsState>()(
  persist(
    (set) => ({
      reservations: getCreditReservations(),
      addReservation: (r) => {
        const entry: CreditReservation = {
          id: crypto.randomUUID(),
          customer_id: r.customer_id,
          order_id: r.order_id,
          amount: r.amount,
          status: "reserved",
          created_at: new Date().toISOString(),
        };
        set((s) => ({ reservations: [entry, ...s.reservations] }));
        return entry;
      },
      releaseReservation: (id) =>
        set((s) => ({
          reservations: s.reservations.map((r) => (r.id === id ? { ...r, status: "released" } : r)),
        })),
    }),
    { name: "flexova.wholesale.credit_reservations" },
  ),
);
