import { create } from "zustand";
import { persist } from "zustand/middleware";
import fnbFixtures from "@/lib/mock/fixtures/fnb.fixtures.json";
import { findMenuItem, FNB_FLAGS, type MenuItem } from "@/features/fnb/menu";
import { useFnbIngredients } from "./fnbIngredients";

export type FnbLineStatus = "held" | "preparing" | "ready" | "served" | "void";
export type FnbOrderStatus = "open" | "fired" | "served" | "billed" | "settled" | "void";
export type FnbOrderType = "dine-in" | "takeaway" | "delivery";

export interface FnbLineModifier {
  group: string;
  option: string;
  delta: number;
}

export interface FnbCheckLine {
  id: string;
  item_id: string;
  name: string;
  course_id: string;
  qty: number;
  modifiers: FnbLineModifier[];
  price: number;
  tax_type_id: string;
  station_id: string;
  status: FnbLineStatus;
  eta_code_missing?: boolean;
}

export interface FnbCheck {
  id: string;
  number: string;
  type: FnbOrderType;
  table_id: string | null;
  section_id?: string;
  guests: number;
  waiter_ar?: string;
  waiter_en?: string;
  customer_id?: string;
  channel?: string;
  status: FnbOrderStatus;
  opened_at: string;
  shift_id?: string;
  lines: FnbCheckLine[];
}

interface FixtureLine {
  id: string;
  item_id: string;
  name: string;
  course_id: string;
  qty: number;
  modifiers: FnbLineModifier[];
  price: number;
  status: string;
  station_id: string;
  _flag?: string;
}

interface FixtureCheck {
  id: string;
  number: string;
  type: FnbOrderType;
  table_id: string | null;
  section_id?: string;
  guests: number;
  waiter_ar?: string;
  waiter_en?: string;
  customer_id?: string;
  channel?: string;
  status: string;
  opened_at: string;
  shift_id?: string;
  lines: FixtureLine[];
}

function seedLine(line: FixtureLine): FnbCheckLine {
  const item = findMenuItem(line.item_id);
  return {
    id: line.id,
    item_id: line.item_id,
    name: line.name,
    course_id: line.course_id,
    qty: line.qty,
    modifiers: line.modifiers,
    price: line.price,
    tax_type_id: item?.tax_type_id ?? "tax_t1",
    station_id: line.station_id,
    status: line.status as FnbLineStatus,
    eta_code_missing: line._flag === "eta_code_missing",
  };
}

function seedCheck(check: FixtureCheck): FnbCheck {
  return {
    id: check.id,
    number: check.number,
    type: check.type,
    table_id: check.table_id,
    section_id: check.section_id,
    guests: check.guests,
    waiter_ar: check.waiter_ar,
    waiter_en: check.waiter_en,
    customer_id: check.customer_id,
    channel: check.channel,
    status: check.status as FnbOrderStatus,
    opened_at: check.opened_at,
    shift_id: check.shift_id,
    lines: check.lines.map(seedLine),
  };
}

const SEED_CHECKS: Record<string, FnbCheck> = Object.fromEntries(
  (fnbFixtures.checks as FixtureCheck[]).map(c => [c.id, seedCheck(c)])
);

interface NewCheckParams {
  type: FnbOrderType;
  table_id: string | null;
  section_id?: string;
  guests: number;
}

interface FnbOrderState {
  checks: Record<string, FnbCheck>;

  ensureCheck: (id: string, params: NewCheckParams) => void;
  addLine: (checkId: string, item: MenuItem, modifiers: FnbLineModifier[], courseId?: string) => void;
  updateQty: (checkId: string, lineId: string, qty: number) => void;
  removeLine: (checkId: string, lineId: string) => void;
  setLineCourse: (checkId: string, lineId: string, courseId: string) => void;
  /** Fire held lines to the kitchen — all of them, or only those in `courseId`. Flips status to `preparing`, flips order status to `fired`, and depletes BOM (flag-aware, never blocks). Returns fired lines for the caller to toast a summary. */
  fireLines: (checkId: string, courseId: string | null) => FnbCheckLine[];
  voidLine: (checkId: string, lineId: string) => void;
}

export const useFnbOrder = create<FnbOrderState>()(
  persist(
    (set, get) => ({
      checks: SEED_CHECKS,

      ensureCheck: (id, params) => {
        if (get().checks[id]) return;
        set((s) => ({
          checks: {
            ...s.checks,
            [id]: {
              id,
              number: id.toUpperCase(),
              type: params.type,
              table_id: params.table_id,
              section_id: params.section_id,
              guests: params.guests,
              channel: "cashier",
              status: "open",
              opened_at: new Date().toISOString(),
              lines: [],
            },
          },
        }));
      },

      addLine: (checkId, item, modifiers, courseId) => set((s) => {
        const check = s.checks[checkId];
        if (!check) return s;
        const line: FnbCheckLine = {
          id: crypto.randomUUID(),
          item_id: item.id,
          name: item.name_ar,
          course_id: courseId ?? item.default_course,
          qty: 1,
          modifiers,
          price: item.price,
          tax_type_id: item.tax_type_id,
          station_id: item.station_id,
          status: "held",
          eta_code_missing: item.eta_code === "",
        };
        return { checks: { ...s.checks, [checkId]: { ...check, lines: [...check.lines, line] } } };
      }),

      updateQty: (checkId, lineId, qty) => set((s) => {
        const check = s.checks[checkId];
        if (!check) return s;
        const clamped = Math.max(1, qty);
        return {
          checks: {
            ...s.checks,
            [checkId]: {
              ...check,
              lines: check.lines.map(l => (l.id === lineId && l.status === "held") ? { ...l, qty: clamped } : l),
            },
          },
        };
      }),

      removeLine: (checkId, lineId) => set((s) => {
        const check = s.checks[checkId];
        if (!check) return s;
        return {
          checks: {
            ...s.checks,
            [checkId]: { ...check, lines: check.lines.filter(l => !(l.id === lineId && l.status === "held")) },
          },
        };
      }),

      setLineCourse: (checkId, lineId, courseId) => set((s) => {
        const check = s.checks[checkId];
        if (!check) return s;
        return {
          checks: {
            ...s.checks,
            [checkId]: {
              ...check,
              lines: check.lines.map(l => (l.id === lineId && l.status === "held") ? { ...l, course_id: courseId } : l),
            },
          },
        };
      }),

      fireLines: (checkId, courseId) => {
        const check = get().checks[checkId];
        if (!check) return [];
        const toFire = check.lines.filter(l => l.status === "held" && (courseId == null || l.course_id === courseId));
        if (toFire.length === 0) return [];

        if (FNB_FLAGS["fnb.recipe"]) {
          const deplete = useFnbIngredients.getState().deplete;
          for (const line of toFire) {
            const item = findMenuItem(line.item_id);
            if (item?.recipe?.enabled) deplete(item.recipe.bom, line.qty);
          }
        }

        const firedIds = new Set(toFire.map(l => l.id));
        set((s) => ({
          checks: {
            ...s.checks,
            [checkId]: {
              ...check,
              status: "fired",
              lines: check.lines.map(l => firedIds.has(l.id) ? { ...l, status: "preparing" } : l),
            },
          },
        }));
        return toFire;
      },

      voidLine: (checkId, lineId) => set((s) => {
        const check = s.checks[checkId];
        if (!check) return s;
        return {
          checks: {
            ...s.checks,
            [checkId]: {
              ...check,
              lines: check.lines.map(l => l.id === lineId ? { ...l, status: "void" } : l),
            },
          },
        };
      }),
    }),
    { name: "flexova.fnb.order" }
  )
);
