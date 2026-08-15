import { create } from "zustand";
import { persist } from "zustand/middleware";
import fnbFixtures from "@/lib/mock/fixtures/fnb.fixtures.json";

export type TableShape = "square" | "round" | "rect";
export type TableStatus = "available" | "occupied" | "reserved" | "dirty";

export interface FnbSection {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface FnbTable {
  id: string;
  section_id: string;
  number: string;
  seats: number;
  x: number;
  y: number;
  shape: TableShape;
  status: TableStatus;
  current_check_id: string | null;
  reserved_for?: string;
}

const SEED_SECTIONS = fnbFixtures.sections as FnbSection[];
const SEED_TABLES = fnbFixtures.tables as FnbTable[];

interface FnbFloorState {
  sections: FnbSection[];
  tables: FnbTable[];
  editMode: boolean;

  setEditMode: (v: boolean) => void;
  moveTable: (id: string, x: number, y: number) => void;
  updateTable: (id: string, patch: Partial<Pick<FnbTable, "seats" | "shape">>) => void;
  addTable: (sectionId: string) => void;
  removeTable: (id: string) => "removed" | "blocked_occupied";
  addSection: (nameAr: string, nameEn: string) => void;
  removeSection: (id: string) => "removed" | "blocked_last" | "blocked_has_tables";
  openCheck: (tableId: string, checkId: string) => void;
  /** Settle frees the table — occupied → dirty (cleaning is a separate, not-yet-built Floor action), and it stops pointing at the now-settled check. */
  freeTable: (tableId: string) => void;
}

export const useFnbFloor = create<FnbFloorState>()(
  persist(
    (set, get) => ({
      sections: SEED_SECTIONS,
      tables: SEED_TABLES,
      editMode: false,

      setEditMode: (v) => set({ editMode: v }),

      moveTable: (id, x, y) => set((s) => ({
        tables: s.tables.map(t => t.id === id ? { ...t, x, y } : t),
      })),

      updateTable: (id, patch) => set((s) => ({
        tables: s.tables.map(t => t.id === id ? { ...t, ...patch } : t),
      })),

      addTable: (sectionId) => set((s) => {
        const inSection = s.tables.filter(t => t.section_id === sectionId);
        const n = inSection.length + 1;
        const table: FnbTable = {
          id: crypto.randomUUID(),
          section_id: sectionId,
          number: String(n),
          seats: 2,
          x: 40 + (inSection.length % 4) * 100,
          y: 60 + Math.floor(inSection.length / 4) * 110,
          shape: "square",
          status: "available",
          current_check_id: null,
        };
        return { tables: [...s.tables, table] };
      }),

      removeTable: (id) => {
        const table = get().tables.find(t => t.id === id);
        if (!table) return "removed";
        if (table.status === "occupied") return "blocked_occupied";
        set((s) => ({ tables: s.tables.filter(t => t.id !== id) }));
        return "removed";
      },

      addSection: (nameAr, nameEn) => set((s) => ({
        sections: [...s.sections, { id: crypto.randomUUID(), name_ar: nameAr, name_en: nameEn }],
      })),

      removeSection: (id) => {
        const { sections, tables } = get();
        if (sections.length <= 1) return "blocked_last";
        if (tables.some(t => t.section_id === id)) return "blocked_has_tables";
        set((s) => ({ sections: s.sections.filter(sec => sec.id !== id) }));
        return "removed";
      },

      openCheck: (tableId, checkId) => set((s) => ({
        tables: s.tables.map(t => t.id === tableId
          ? { ...t, status: "occupied", current_check_id: checkId }
          : t
        ),
      })),

      freeTable: (tableId) => set((s) => ({
        tables: s.tables.map(t => t.id === tableId
          ? { ...t, status: "dirty", current_check_id: null }
          : t
        ),
      })),
    }),
    { name: "flexova.fnb.floor" }
  )
);
