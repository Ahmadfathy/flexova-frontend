import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getCustomers } from "@/lib/mock/wholesale";
import type { WholesaleCustomer } from "@/types/wholesale";

interface WholesaleCustomersState {
  customers: WholesaleCustomer[];
  /** Invoicing converts a released reservation into real AR (FE_13 §6) — the
   * only place `ar_balance` changes; approval only ever touches reservations. */
  adjustArBalance: (customerId: string, delta: number) => void;
}

export const useWholesaleCustomers = create<WholesaleCustomersState>()(
  persist(
    (set) => ({
      customers: getCustomers(),
      adjustArBalance: (customerId, delta) =>
        set((s) => ({
          customers: s.customers.map((c) =>
            c.id === customerId ? { ...c, ar_balance: Math.round((c.ar_balance + delta) * 100) / 100 } : c,
          ),
        })),
    }),
    { name: "flexova.wholesale.customers" },
  ),
);
