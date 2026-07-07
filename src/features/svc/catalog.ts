import svcFixtures from "@/lib/mock/fixtures/svc.fixtures.json";
import crmFixtures from "@/lib/mock/fixtures/crm.fixtures.json";
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

interface CrmCustomer {
  id: string;
  name_ar: string;
  name_en: string;
}

export const PROVIDERS = svcFixtures.providers as SvcProvider[];
export const SERVICES = svcFixtures.services_seed as SvcService[];
const CLIENTS = crmFixtures.customers as CrmCustomer[];

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
