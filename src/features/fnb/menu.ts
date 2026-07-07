import fnbFixtures from "@/lib/mock/fixtures/fnb.fixtures.json";

export interface ModifierOption {
  id: string;
  name_ar: string;
  name_en: string;
  delta: number;
}

export interface ModifierGroup {
  id: string;
  name_ar: string;
  name_en: string;
  type: "single" | "multi";
  required: boolean;
  options: ModifierOption[];
}

export interface MenuItemBomLine {
  ingredient_id: string;
  qty: number;
  uom_id: string;
}

export interface MenuItem {
  id: string;
  ref_item?: string;
  name_ar: string;
  name_en: string;
  category: string;
  station_id: string;
  price: number;
  tax_type_id: string;
  eta_code: string;
  uom_id: string;
  default_course: string;
  modifier_groups: string[];
  recipe: { enabled: boolean; bom: MenuItemBomLine[] } | null;
}

export interface MenuCategory {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface FnbCourse {
  id: string;
  name_ar: string;
  name_en: string;
  seq: number;
}

export interface KitchenStation {
  id: string;
  name_ar: string;
  name_en: string;
}

export const MENU_ITEMS = fnbFixtures.menu_items as MenuItem[];
export const MENU_CATEGORIES = fnbFixtures.menu_categories as MenuCategory[];
export const MODIFIER_GROUPS = fnbFixtures.modifier_groups as ModifierGroup[];
export const FNB_COURSES = [...(fnbFixtures.courses as FnbCourse[])].sort((a, b) => a.seq - b.seq);
export const KITCHEN_STATIONS = fnbFixtures.kitchen_stations as KitchenStation[];
export const FNB_FLAGS = (fnbFixtures._meta as { flags: Record<string, boolean> }).flags;

export function findMenuItem(id: string): MenuItem | undefined {
  return MENU_ITEMS.find(m => m.id === id);
}

export function findModifierGroup(id: string): ModifierGroup | undefined {
  return MODIFIER_GROUPS.find(g => g.id === id);
}

export function findCourse(id: string): FnbCourse | undefined {
  return FNB_COURSES.find(c => c.id === id);
}

export function findStation(id: string): KitchenStation | undefined {
  return KITCHEN_STATIONS.find(s => s.id === id);
}

export function modifierLabels(
  modifiers: { group: string; option: string }[],
  lang: "ar" | "en"
): string[] {
  return modifiers
    .map(m => {
      const group = findModifierGroup(m.group);
      const opt = group?.options.find(o => o.id === m.option);
      return opt ? (lang === "ar" ? opt.name_ar : opt.name_en) : null;
    })
    .filter((x): x is string => !!x);
}
