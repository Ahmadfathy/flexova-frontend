import type { LucideIcon } from "lucide-react";
import {
  Package, ShoppingCart, Truck, Users, Calculator,
  UserCog, BarChart3, Shield, Settings, Store, UtensilsCrossed,
} from "lucide-react";

export type MenuGroup = "core" | "sector" | "admin";

export interface SubItem {
  key: string;
  route: string;
  permission?: string;
}

export interface MenuItem {
  key: string;
  icon: LucideIcon;
  route: string;
  group: MenuGroup;
  order: number;
  permission?: string;
  moduleFlag?: string;
  status?: "active" | "soon";
  subItems?: SubItem[];
}

export const MENU: MenuItem[] = [
  {
    key: "inventory",
    icon: Package,
    route: "/inventory",
    group: "core",
    order: 1,
    subItems: [
      { key: "items",        route: "/inventory/items" },
      { key: "categories",   route: "/inventory/categories" },
      { key: "price_lists",  route: "/inventory/price-lists" },
      { key: "warehouses",   route: "/inventory/warehouses" },
      { key: "stocktakes",   route: "/inventory/stocktakes" },
      { key: "transfers",    route: "/inventory/transfers" },
      { key: "adjustments",  route: "/inventory/adjustments" },
      { key: "low_stock",    route: "/inventory/low-stock" },
    ],
  },
  {
    key: "sales",
    icon: ShoppingCart,
    route: "/sales",
    group: "core",
    order: 2,
    subItems: [
      { key: "invoices",     route: "/sales/invoices" },
      { key: "quotations",   route: "/sales/quotations" },
      { key: "credit_notes", route: "/sales/credit-notes" },
      { key: "debit_notes",  route: "/sales/debit-notes" },
      { key: "receipts",     route: "/sales/receipts" },
      { key: "eta_hub",      route: "/sales/eta-hub" },
    ],
  },
  {
    key: "purchasing",
    icon: Truck,
    route: "/purchasing",
    group: "core",
    order: 3,
    subItems: [
      { key: "suppliers",    route: "/purchasing/suppliers" },
      { key: "invoices",     route: "/purchasing/invoices" },
      { key: "orders",       route: "/purchasing/orders" },
      { key: "returns",      route: "/purchasing/returns" },
      { key: "vouchers",     route: "/purchasing/vouchers" },
      { key: "inbound_eta",  route: "/purchasing/inbound-eta" },
    ],
  },
  {
    key: "accounting",
    icon: Calculator,
    route: "/finance",
    group: "core",
    order: 4,
    subItems: [
      { key: "finance_overview",  route: "/finance/dashboard" },
      { key: "treasuries",        route: "/finance/treasuries" },
      { key: "expenses",          route: "/finance/expenses" },
      { key: "receipt_vouchers",  route: "/finance/receipts" },
      { key: "payment_vouchers",  route: "/finance/payments" },
      { key: "fin_transfers",     route: "/finance/transfers" },
      { key: "journal",           route: "/finance/journal" },
      { key: "coa",               route: "/finance/coa" },
      { key: "trial_balance",     route: "/finance/trial-balance" },
      { key: "statements",        route: "/finance/statements" },
      { key: "reconciliation",    route: "/finance/reconciliation" },
      { key: "closing",           route: "/finance/closing" },
    ],
  },
  {
    key: "customers",
    icon: Users,
    route: "/customers",
    group: "core",
    order: 5,
    subItems: [
      { key: "customers_list",    route: "/customers/list" },
      { key: "follow_ups",        route: "/customers/follow-ups" },
      { key: "segments",          route: "/customers/segments" },
      { key: "communications",    route: "/customers/communications" },
    ],
  },
  {
    key: "hr",
    icon: UserCog,
    route: "/hr",
    group: "core",
    order: 6,
    subItems: [
      { key: "hr_overview",       route: "/hr/dashboard" },
      { key: "employees",         route: "/hr/employees" },
      { key: "attendance",        route: "/hr/attendance" },
      { key: "advances",          route: "/hr/advances" },
      { key: "payroll",           route: "/hr/payroll" },
      { key: "commissions",       route: "/hr/commissions" },
    ],
  },
  {
    key: "reports",
    icon: BarChart3,
    route: "/reports",
    group: "core",
    order: 7,
    subItems: [
      { key: "reports_overview",  route: "/reports/dashboard" },
      { key: "report_library",    route: "/reports/library" },
      { key: "saved_reports",     route: "/reports/saved" },
      { key: "eta_tax",           route: "/reports/eta-tax" },
      { key: "z_report",          route: "/reports/z-report" },
      { key: "scheduling",        route: "/reports/scheduling" },
    ],
  },
  {
    key: "pos",
    icon: Store,
    route: "/pos",
    group: "sector",
    order: 8,
    moduleFlag: "pos",
    permission: "pos.access",
  },
  {
    key: "fnb",
    icon: UtensilsCrossed,
    route: "/fnb",
    group: "sector",
    order: 9,
    moduleFlag: "fnb",
    permission: "fnb.access",
  },
  {
    key: "permissions",
    icon: Shield,
    route: "/admin",
    group: "admin",
    order: 10,
    subItems: [
      { key: "users",     route: "/admin/users" },
      { key: "roles",     route: "/admin/roles" },
      { key: "branches",  route: "/admin/branches" },
      { key: "security",  route: "/admin/security" },
      { key: "audit",     route: "/admin/audit" },
    ],
  },
  {
    key: "settings",
    icon: Settings,
    route: "/settings",
    group: "admin",
    order: 11,
    subItems: [
      { key: "settings_appearance", route: "/settings/appearance" },
    ],
  },
];

export const MENU_CORE  = MENU.filter(m => m.group === "core");
export const MENU_ADMIN = MENU.filter(m => m.group === "admin");
