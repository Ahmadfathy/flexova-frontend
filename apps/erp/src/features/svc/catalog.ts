import svcFixtures from "@/lib/mock/fixtures/svc.fixtures.json";
import crmFixtures from "@/lib/mock/fixtures/CRM.fixtures.json";
import type { Lang } from "@/stores/appearance";

export interface SvcProvider {
  id: string;
  employee_id: string;
  name_ar: string;
  name_en: string;
  services: string[];
  commission_pct: number;
  availability: { days: string[]; from: string; to: string };
}

export interface SvcService {
  id: string;
  name_ar: string;
  name_en: string;
  duration_min: number;
  price: number;
  tax_type_id: string;
  eta_code: string;
  category: string;
}

export interface CrmCustomer {
  id: string;
  name_ar: string;
  name_en: string;
  trn?: string | null;
}

/** Optional cancellation/no-show fee (EGP) — flat per-config amount, applied when the caller opts in. */
export const CANCELLATION_FEE_EGP = 50;

/** New bookings created from the calendar always land on the main branch (single-branch fixtures seed). */
export const DEFAULT_BRANCH_ID = "br_main";

export const PROVIDERS = svcFixtures.providers as SvcProvider[];
export const SERVICES = svcFixtures.services_seed as SvcService[];
export const CLIENTS = crmFixtures.customers as CrmCustomer[];

export function findProvider(id: string | null | undefined): SvcProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function findService(id: string | null | undefined): SvcService | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function findClient(id: string | null | undefined): CrmCustomer | undefined {
  return CLIENTS.find((c) => c.id === id);
}

export function providerName(provider: SvcProvider | undefined, lang: Lang): string {
  if (!provider) return "";
  return lang === "ar" ? provider.name_ar : provider.name_en;
}

export function serviceName(service: SvcService | undefined, lang: Lang): string {
  if (!service) return "";
  return lang === "ar" ? service.name_ar : service.name_en;
}

export function clientName(client: CrmCustomer | undefined, lang: Lang): string {
  if (!client) return "";
  return lang === "ar" ? client.name_ar : client.name_en;
}

/** Joined display label for an appointment's service list, e.g. "Men's haircut · Beard trim". */
export function servicesLabel(serviceIds: string[], lang: Lang): string {
  return serviceIds.map((id) => serviceName(findService(id), lang)).filter(Boolean).join(" · ");
}

export function servicesDuration(serviceIds: string[]): number {
  return serviceIds.reduce((sum, id) => sum + (findService(id)?.duration_min ?? 0), 0);
}

export function servicesPrice(serviceIds: string[]): number {
  return serviceIds.reduce((sum, id) => sum + (findService(id)?.price ?? 0), 0);
}

/** Providers able to perform every service in `serviceIds` (empty selection → nobody qualifies yet). */
export function eligibleProviders(serviceIds: string[]): SvcProvider[] {
  if (serviceIds.length === 0) return [];
  return PROVIDERS.filter((p) => serviceIds.every((id) => p.services.includes(id)));
}
