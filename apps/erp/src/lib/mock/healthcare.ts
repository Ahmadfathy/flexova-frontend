import fixtures from "./fixtures/healthcare.fixtures.json";
import type {
  HcPatient, HcOwner, HcProvider, HcPayer, HcPlan, HcCatalogItem,
  HcEncounter, HcOrder, HcResult, HcInvoice, TodayBoardFixtureRow,
  HealthcareAccessLogEntry,
} from "@/features/healthcare/types";

/** Signatures read straight through the fixture — mirrors a future per-tenant REST API. */

export function getHealthcareMeta() {
  return fixtures._meta;
}

export function getPatients(): HcPatient[] {
  return fixtures.patients as HcPatient[];
}

export function getPatient(id: string | null | undefined): HcPatient | undefined {
  return id ? getPatients().find((p) => p.id === id) : undefined;
}

export function getOwners(): HcOwner[] {
  return fixtures.owners as HcOwner[];
}

export function getOwner(id: string | null | undefined): HcOwner | undefined {
  return id ? getOwners().find((o) => o.id === id) : undefined;
}

export function getProviders(): HcProvider[] {
  return fixtures.providers as HcProvider[];
}

export function getProvider(id: string | null | undefined): HcProvider | undefined {
  return id ? getProviders().find((p) => p.id === id) : undefined;
}

export function getPayers(): HcPayer[] {
  return fixtures.payers as HcPayer[];
}

export function getPayer(id: string | null | undefined): HcPayer | undefined {
  return id ? getPayers().find((p) => p.id === id) : undefined;
}

export function getPlans(): HcPlan[] {
  return fixtures.plans as HcPlan[];
}

export function getPlan(id: string | null | undefined): HcPlan | undefined {
  return id ? getPlans().find((p) => p.id === id) : undefined;
}

export function getCatalog(): HcCatalogItem[] {
  return fixtures.catalog as HcCatalogItem[];
}

export function getEncounters(): HcEncounter[] {
  return fixtures.encounters as unknown as HcEncounter[];
}

export function getEncounter(id: string | null | undefined): HcEncounter | undefined {
  return id ? getEncounters().find((e) => e.id === id) : undefined;
}

export function getEncounterByAppointment(appointmentId: string | null | undefined): HcEncounter | undefined {
  return appointmentId ? getEncounters().find((e) => e.appointment_id === appointmentId) : undefined;
}

export function getOrders(): HcOrder[] {
  return fixtures.orders as unknown as HcOrder[];
}

export function getResults(): HcResult[] {
  return fixtures.results as HcResult[];
}

export function getInvoices(): HcInvoice[] {
  return fixtures.invoices as unknown as HcInvoice[];
}

export function getInvoice(id: string | null | undefined): HcInvoice | undefined {
  return id ? getInvoices().find((i) => i.id === id) : undefined;
}

export function getInvoiceByEncounter(encounterId: string | null | undefined): HcInvoice | undefined {
  return encounterId ? getInvoices().find((i) => i.encounter_id === encounterId) : undefined;
}

export function getTodayBoard(): TodayBoardFixtureRow[] {
  return fixtures.today_board as TodayBoardFixtureRow[];
}

export function getSeedAccessLog(): HealthcareAccessLogEntry[] {
  return fixtures.access_log as HealthcareAccessLogEntry[];
}

/** Bilingual name helpers — every entity carries `name_ar` + optional `name_en`. */
export function patientName(p: HcPatient, lang: "ar" | "en"): string {
  return lang === "ar" ? p.name_ar : (p.name_en || p.name_ar);
}

export function providerName(p: HcProvider, lang: "ar" | "en"): string {
  return lang === "ar" ? p.name_ar : (p.name_en || p.name_ar);
}

export function ownerName(o: HcOwner, lang: "ar" | "en"): string {
  return lang === "ar" ? o.name_ar : (o.name_en || o.name_ar);
}
