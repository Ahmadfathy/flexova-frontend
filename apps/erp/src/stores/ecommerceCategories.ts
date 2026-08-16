import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getStoreCategories } from "@/lib/mock/ecommerce";
import type { EcStoreCategory } from "@/features/ecommerce/types";

/**
 * Store categories local state (spec §4 "Add/edit/reorder (hierarchy)").
 * Kept as an ordered *array* (not a keyed map like orders/products) so
 * sibling order is just array position — `reorder` swaps two adjacent
 * siblings directly rather than needing a separate `order` field on the
 * entity, simplest thing that satisfies "reorder" without pulling in a
 * tree-drag-and-drop library for what the fixture only ever needs two
 * levels deep.
 */

let seq = 1;
function nextId(): string {
  return `cat_new_${seq++}`;
}

interface EcommerceCategoriesState {
  categories: EcStoreCategory[];
  createCategory: (input: Omit<EcStoreCategory, "id">) => string;
  updateCategory: (id: string, patch: Partial<Omit<EcStoreCategory, "id">>) => void;
  deleteCategory: (id: string) => void;
  /** Swaps this category with the sibling immediately before/after it
   * (same `parent_id`) — a no-op at either end of its sibling group. */
  reorder: (id: string, direction: "up" | "down") => void;
}

export const useEcommerceCategories = create<EcommerceCategoriesState>()(
  persist(
    (set) => ({
      categories: getStoreCategories(),

      createCategory: (input) => {
        const id = nextId();
        set((s) => ({ categories: [...s.categories, { ...input, id }] }));
        return id;
      },

      updateCategory: (id, patch) => {
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      },

      deleteCategory: (id) => {
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
      },

      reorder: (id, direction) => {
        set((s) => {
          const list = [...s.categories];
          const i = list.findIndex((c) => c.id === id);
          if (i === -1) return s;
          const siblingIds = list.filter((c) => c.parent_id === list[i].parent_id).map((c) => c.id);
          const posInSiblings = siblingIds.indexOf(id);
          const swapWithId = direction === "up" ? siblingIds[posInSiblings - 1] : siblingIds[posInSiblings + 1];
          if (!swapWithId) return s;
          const j = list.findIndex((c) => c.id === swapWithId);
          [list[i], list[j]] = [list[j], list[i]];
          return { categories: list };
        });
      },
    }),
    { name: "flexova.ecommerce.categories", partialize: (s) => ({ categories: s.categories }) }
  )
);
