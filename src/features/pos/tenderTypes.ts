import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";

export interface TenderType {
  id: string;
  name_ar: string;
  name_en: string;
  gives_change: boolean;
  requires_customer?: boolean;
  credit_check?: boolean;
  requires_balance?: boolean;
}

export const TENDER_TYPES = posFixtures.tender_types as TenderType[];

export function tenderName(id: string, lang: "ar" | "en"): string {
  const tt = TENDER_TYPES.find(t => t.id === id);
  return tt ? (lang === "ar" ? tt.name_ar : tt.name_en) : id;
}
