import fixtures from "./fixtures/whl.fixtures.json";
import type {
  SalesOrder, DeliveryNote, Route, Visit, VanStockEntry, VanLoad, VanShift,
  WholesaleCustomer, PriceListLine, CreditReservation, Collection, SyncOp, AgingBucket,
  Uom, WholesaleItem, WholesalePriceListHeader, Rep, AuditEntry,
} from "@/types/wholesale";

export function getUoms(): Uom[] {
  return fixtures.uoms as Uom[];
}

export function getItems(): WholesaleItem[] {
  return fixtures.items as WholesaleItem[];
}

export function getPriceLists(): WholesalePriceListHeader[] {
  return fixtures.price_lists as WholesalePriceListHeader[];
}

export function getOrders(): SalesOrder[] {
  return fixtures.sales_orders as SalesOrder[];
}

export function getOrder(id: string): SalesOrder | undefined {
  return getOrders().find((o) => o.id === id);
}

export function getDeliveryNotes(): DeliveryNote[] {
  return fixtures.delivery_notes as DeliveryNote[];
}

export function getRoutes(): Route[] {
  return fixtures.routes as Route[];
}

export function getVisits(): Visit[] {
  return fixtures.visits as Visit[];
}

export function getVanStock(): VanStockEntry[] {
  return fixtures.van_stock as VanStockEntry[];
}

export function getVanLoads(): VanLoad[] {
  return fixtures.van_loads as VanLoad[];
}

export function getShifts(): VanShift[] {
  return fixtures.shifts as VanShift[];
}

export function getCustomers(): WholesaleCustomer[] {
  return fixtures.customers as WholesaleCustomer[];
}

export function getPriceListLines(): PriceListLine[] {
  return fixtures.price_list_lines as PriceListLine[];
}

export function getCreditReservations(): CreditReservation[] {
  return fixtures.credit_reservations as CreditReservation[];
}

export function getCollections(): Collection[] {
  return fixtures.collections as Collection[];
}

export function getSyncQueue(): SyncOp[] {
  return fixtures.sync_queue as SyncOp[];
}

export function getAgingBuckets(): AgingBucket[] {
  return fixtures.aging_buckets as AgingBucket[];
}

export function getReps(): Rep[] {
  return fixtures.reps as Rep[];
}

export function getAudit(): AuditEntry[] {
  return fixtures.audit as AuditEntry[];
}
