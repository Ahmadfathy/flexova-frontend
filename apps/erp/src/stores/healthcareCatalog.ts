import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getCatalog } from "@/lib/mock/healthcare";
import type { HcCatalogItem } from "@/features/healthcare/types";

/**
 * Service & Test catalog (spec §9) — single source of truth from here on.
 * The Encounter Labs/Radiology tab (Prompt 2) and the split engine's consult
 * line read live off this store, not the static fixture accessor, so an
 * admin-added or disabled item is reflected immediately in the order picker
 * (spec §9.6 — "catalog items appear in encounter order pickers; disabled
 * items excluded").
 */

let localSeq = 0;
function nextLocalId(): string {
  localSeq += 1;
  return `svc_local_${localSeq}`;
}

function seedItems(): Record<string, HcCatalogItem> {
  return Object.fromEntries(getCatalog().map((c) => [c.id, c]));
}

export interface NewCatalogItemInput {
  name_ar: string;
  type: HcCatalogItem["type"];
  price: number;
  default_provider: string;
}

export interface CsvImportResult {
  added: number;
  deduped: number;
}

interface CatalogState {
  items: Record<string, HcCatalogItem>;

  addItem: (input: NewCatalogItemInput) => HcCatalogItem;
  updateItem: (id: string, patch: Partial<HcCatalogItem>) => void;
  toggleActive: (id: string) => void;
  /** CSV columns: name_ar,type,price,default_provider — header row optional.
   * Dedupes against existing items by name_ar+type (case-insensitive). */
  importCsv: (text: string) => CsvImportResult;
}

export const useHealthcareCatalog = create<CatalogState>()(
  persist(
    (set, get) => ({
      items: seedItems(),

      addItem: (input) => {
        const id = nextLocalId();
        const item: HcCatalogItem = { id, ...input, active: true };
        set((s) => ({ items: { ...s.items, [id]: item } }));
        return item;
      },

      updateItem: (id, patch) => {
        set((s) => {
          const item = s.items[id];
          if (!item) return s;
          return { items: { ...s.items, [id]: { ...item, ...patch } } };
        });
      },

      toggleActive: (id) => {
        set((s) => {
          const item = s.items[id];
          if (!item) return s;
          return { items: { ...s.items, [id]: { ...item, active: !item.active } } };
        });
      },

      importCsv: (text) => {
        const existing = Object.values(get().items);
        const key = (name: string, type: string) => `${name.trim().toLowerCase()}::${type.trim().toLowerCase()}`;
        const seen = new Set(existing.map((i) => key(i.name_ar, i.type)));
        const validTypes = new Set(["consult", "lab", "radiology", "procedure"]);

        let added = 0, deduped = 0;
        const toAdd: HcCatalogItem[] = [];

        for (const rawLine of text.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line) continue;
          const [name_ar, type, priceStr, default_provider = ""] = line.split(",").map((c) => c.trim());
          if (!name_ar || !type || !priceStr) continue;
          if (name_ar.toLowerCase() === "name_ar" || name_ar.toLowerCase() === "name") continue; // header row
          if (!validTypes.has(type)) continue;
          const price = Number(priceStr);
          if (!Number.isFinite(price)) continue;

          const k = key(name_ar, type);
          if (seen.has(k)) { deduped++; continue; }
          seen.add(k);
          toAdd.push({ id: nextLocalId(), name_ar, type: type as HcCatalogItem["type"], price, default_provider, active: true });
          added++;
        }

        if (toAdd.length > 0) {
          set((s) => ({ items: { ...s.items, ...Object.fromEntries(toAdd.map((i) => [i.id, i])) } }));
        }
        return { added, deduped };
      },
    }),
    { name: "flexova.healthcare.catalog" }
  )
);
