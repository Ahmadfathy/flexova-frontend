import fixtures from "./fixtures/play.fixtures.json";
import type {
  SectorSettings, ServiceItem, RatePlan, DeviceType, Device,
  Session, Check, Product, Branch, Shift,
} from "@/features/play/types";

export function getSectorSettings(): SectorSettings {
  return fixtures.sector_settings as SectorSettings;
}

export function getServiceItems(): ServiceItem[] {
  return fixtures.service_items as ServiceItem[];
}

export function getServiceItem(id: string): ServiceItem | undefined {
  return getServiceItems().find((s) => s.id === id);
}

export function getRatePlans(): RatePlan[] {
  return fixtures.rate_plans as RatePlan[];
}

export function getRatePlan(id: string): RatePlan | undefined {
  return getRatePlans().find((r) => r.id === id);
}

export function getDeviceTypes(): DeviceType[] {
  return fixtures.device_types as DeviceType[];
}

export function getDeviceType(id: string): DeviceType | undefined {
  return getDeviceTypes().find((d) => d.id === id);
}

export function getDevices(): Device[] {
  return fixtures.devices as Device[];
}

export function getDevice(id: string): Device | undefined {
  return getDevices().find((d) => d.id === id);
}

export function getSessions(): Session[] {
  return fixtures.sessions as Session[];
}

export function getSession(id: string): Session | undefined {
  return getSessions().find((s) => s.id === id);
}

export function getChecks(): Check[] {
  return fixtures.checks as Check[];
}

export function getCheck(id: string): Check | undefined {
  return getChecks().find((c) => c.id === id);
}

export function getProducts(): Product[] {
  return fixtures.products as Product[];
}

export function getProduct(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}

export function getBranches(): Branch[] {
  return fixtures.branches as Branch[];
}

export function getShift(): Shift {
  return fixtures.shift as Shift;
}
