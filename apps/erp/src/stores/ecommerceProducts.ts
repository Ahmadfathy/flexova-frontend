import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getOnlineProducts } from "@/lib/mock/ecommerce";
import type { EcOnlineProduct } from "@/features/ecommerce/types";

/**
 * Online products local state (spec §3). Seeded once from
 * `online_products[]`; create/update are local-only mutations (mock —
 * a real backend persists these and fires the real revalidation webhook).
 * `lastRevalidatedAt` is the mock stand-in for "on save → `revalidateTag`
 * propagates to all storefront instances" (spec §3.2/§10) — there's no
 * real Next.js instance to invalidate from this admin, so this is the
 * honest, visible proof the hook fired, not a silent no-op.
 */

function seedProducts(): Record<string, EcOnlineProduct> {
  return Object.fromEntries(getOnlineProducts().map((p) => [p.id, p]));
}

let seq = 1006; // fixture's demo ids run op_1001..op_1005

interface EcommerceProductsState {
  products: Record<string, EcOnlineProduct>;
  lastRevalidatedAt: string | null;
  /** Returns the new product's id. */
  createProduct: (input: Omit<EcOnlineProduct, "id">) => string;
  updateProduct: (id: string, patch: Partial<Omit<EcOnlineProduct, "id">>) => void;
  setPublishStatus: (id: string, status: EcOnlineProduct["publish_status"]) => void;
}

export const useEcommerceProducts = create<EcommerceProductsState>()(
  persist(
    (set) => ({
      products: seedProducts(),
      lastRevalidatedAt: null,

      createProduct: (input) => {
        const id = `op_${seq++}`;
        set((s) => ({
          products: { ...s.products, [id]: { ...input, id } },
          lastRevalidatedAt: new Date().toISOString(),
        }));
        return id;
      },

      updateProduct: (id, patch) => {
        set((s) => {
          const existing = s.products[id];
          if (!existing) return s;
          return {
            products: { ...s.products, [id]: { ...existing, ...patch } },
            lastRevalidatedAt: new Date().toISOString(),
          };
        });
      },

      setPublishStatus: (id, status) => {
        set((s) => {
          const existing = s.products[id];
          if (!existing) return s;
          return {
            products: { ...s.products, [id]: { ...existing, publish_status: status } },
            lastRevalidatedAt: new Date().toISOString(),
          };
        });
      },
    }),
    { name: "flexova.ecommerce.products", partialize: (s) => ({ products: s.products }) }
  )
);
