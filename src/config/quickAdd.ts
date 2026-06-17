import type { LucideIcon } from "lucide-react";
import {
  FileText, ClipboardList, Receipt,
  Package, ArrowLeftRight, SlidersHorizontal,
  ShoppingBag, Building2,
  UserRound, CalendarClock,
  CreditCard, ArrowDownToLine,
  UserPlus, Banknote,
} from "lucide-react";

export interface QuickAddAction {
  key: string;          // unique id; also used as i18n subkey: shell "quick_add.<key>"
  icon: LucideIcon;
  route: string;        // navigate to this path (create screen / modal anchor)
  group: string;        // MENU item key — determines which module group this belongs to
  permission?: string;  // future: plugged into FE_08 can(permission)
  moduleFlag?: string;  // future: module-entitlement check
}

/**
 * Create-actions registry.
 * Ordered within each group by UX priority (most-common first).
 * Group order follows MENU order automatically (useQuickAddGroups in QuickAdd.tsx).
 *
 * To add a new action: push an entry here + add the i18n key to shell.json.
 * To remove an action for a role: wire `permission` to FE_08 can().
 */
export const QUICK_ADD: QuickAddAction[] = [
  // ── Sales ──────────────────────────────────────────────────
  { key: "new_invoice",     icon: FileText,          route: "/sales/invoices/new",       group: "sales",       permission: "sales.invoice.create" },
  { key: "new_quotation",   icon: ClipboardList,     route: "/sales/quotations/new",     group: "sales",       permission: "sales.quotation.create" },
  { key: "new_receipt",     icon: Receipt,           route: "/sales/receipts/new",       group: "sales",       permission: "sales.receipt.create" },

  // ── Inventory ───────────────────────────────────────────────
  { key: "new_item",        icon: Package,           route: "/inventory/items/new",      group: "inventory",   permission: "inventory.item.create" },
  { key: "new_transfer",    icon: ArrowLeftRight,    route: "/inventory/transfers/new",  group: "inventory",   permission: "inventory.transfer.create" },
  { key: "new_adjustment",  icon: SlidersHorizontal, route: "/inventory/adjustments/new",group: "inventory",   permission: "inventory.adjustment.create" },

  // ── Purchasing ──────────────────────────────────────────────
  { key: "new_purchase_invoice", icon: FileText,    route: "/purchasing/invoices/new",  group: "purchasing",  permission: "purchasing.invoice.create" },
  { key: "new_purchase_order",   icon: ShoppingBag, route: "/purchasing/orders/new",    group: "purchasing",  permission: "purchasing.order.create" },
  { key: "new_supplier",         icon: Building2,   route: "/purchasing/suppliers/new", group: "purchasing",  permission: "purchasing.supplier.create" },

  // ── Customers (CRM) ─────────────────────────────────────────
  { key: "new_customer",    icon: UserRound,         route: "/customers/list/new",       group: "customers",   permission: "crm.customer.create" },
  { key: "new_follow_up",   icon: CalendarClock,     route: "/customers/follow-ups/new", group: "customers",   permission: "crm.followup.create" },

  // ── Accounting ──────────────────────────────────────────────
  { key: "new_expense",          icon: CreditCard,      route: "/finance/expenses/new",  group: "accounting",  permission: "finance.expense.create" },
  { key: "new_payment_voucher",  icon: ArrowDownToLine, route: "/finance/payments/new",  group: "accounting",  permission: "finance.payment.create" },

  // ── HR ──────────────────────────────────────────────────────
  { key: "new_employee",    icon: UserPlus,          route: "/hr/employees/new",         group: "hr",          permission: "hr.employee.create" },
  { key: "new_advance",     icon: Banknote,          route: "/hr/advances/new",          group: "hr",          permission: "hr.advance.create" },
];
