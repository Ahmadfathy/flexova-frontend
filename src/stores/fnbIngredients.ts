import { create } from "zustand";
import { persist } from "zustand/middleware";
import fnbFixtures from "@/lib/mock/fixtures/fnb.fixtures.json";
import type { MenuItemBomLine } from "@/features/fnb/menu";

interface IngredientSeed {
  id: string;
  name_ar: string;
  name_en: string;
  uom_id: string;
  stock?: number;
  stock_kg?: number;
}

const SEED = fnbFixtures.ingredients_seed as IngredientSeed[];

interface FnbIngredientsState {
  stock: Record<string, number>;
  /** Depletes raw ingredients for a recipe BOM — called from `fireLines` when `fnb.recipe` is on and the item has a recipe. Never blocks the fire even if stock goes negative. */
  deplete: (bom: MenuItemBomLine[], multiplier: number) => void;
}

export const useFnbIngredients = create<FnbIngredientsState>()(
  persist(
    (set) => ({
      stock: Object.fromEntries(SEED.map(i => [i.id, i.stock ?? i.stock_kg ?? 0])),

      deplete: (bom, multiplier) => set((s) => {
        const stock = { ...s.stock };
        for (const line of bom) {
          stock[line.ingredient_id] = (stock[line.ingredient_id] ?? 0) - line.qty * multiplier;
        }
        return { stock };
      }),
    }),
    { name: "flexova.fnb.ingredients" }
  )
);
