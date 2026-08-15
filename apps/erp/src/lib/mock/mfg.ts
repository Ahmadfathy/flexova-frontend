import fixtures from "./fixtures/mfg.fixtures.json";
import type {
  MfgWarehouse, MfgItem, MfgScrapReason, BomTemplate,
  ManufacturingOrder, MfgDashboard, JournalPreviewEntry,
} from "@/types/mfg";

export function getWarehouses(): MfgWarehouse[] {
  return fixtures.warehouses as MfgWarehouse[];
}

export function getItems(): MfgItem[] {
  return fixtures.items as MfgItem[];
}

export function getScrapReasons(): MfgScrapReason[] {
  return fixtures.scrap_reasons as MfgScrapReason[];
}

export function getBomTemplates(): BomTemplate[] {
  return fixtures.bom_templates as BomTemplate[];
}

export function getBomTemplate(id: string): BomTemplate | undefined {
  return getBomTemplates().find((b) => b.id === id);
}

export function getManufacturingOrders(): ManufacturingOrder[] {
  return fixtures.manufacturing_orders as ManufacturingOrder[];
}

export function getManufacturingOrder(id: string): ManufacturingOrder | undefined {
  return getManufacturingOrders().find((o) => o.id === id || o.number === id);
}

export function getDashboard(): MfgDashboard {
  return fixtures.dashboard as MfgDashboard;
}

export function getJournalPreview(): JournalPreviewEntry[] {
  return fixtures.journal_preview as JournalPreviewEntry[];
}
