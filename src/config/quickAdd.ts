import type { LucideIcon } from "lucide-react";
import {
  FileText, ClipboardList, Receipt, FileMinus, FilePlus,
  PackagePlus, FolderPlus, Tag, Warehouse, ClipboardCheck, ArrowLeftRight, SlidersHorizontal,
  ShoppingBag, Building2, RotateCcw, ArrowDownToLine,
  CreditCard, HandCoins, Wallet, BookOpen, ListTree,
  UserRound, CalendarClock, Layers, MessageSquare,
  UserPlus, Banknote, PlayCircle,
  Building,
} from "lucide-react";

export interface QuickAddAction {
  key: string;          // unique id; also used as i18n subkey: shell "quick_add.<key>"
  icon: LucideIcon;
  route: string;        // navigate to this path (create screen, or list route + ?new=1 to auto-open its create modal)
  group: string;        // MENU item key — determines which module group this belongs to
  permission?: string;  // plugged into FE_08 can(permission)
  moduleFlag?: string;  // module-entitlement check
}

/**
 * Create-actions registry.
 * Every entry here is a real "create a new record" affordance that exists
 * somewhere in the app today — either a dedicated "/new" route, or a list
 * page whose create modal/drawer auto-opens via a `?new=1` query param
 * (the same convention already used by purchase orders/returns/vouchers).
 *
 * Ordered within each group by UX priority (most-common first).
 * Group order follows MENU order automatically (useQuickAddGroups in QuickAdd.tsx).
 *
 * To add a new action: push an entry here + add the i18n key to shell.json.
 * To remove an action for a role: wire `permission` to FE_08 can().
 */
export const QUICK_ADD: QuickAddAction[] = [
  // ── Sales ──────────────────────────────────────────────────
  { key: "new_invoice",      icon: FileText,      route: "/sales/invoices/new",        group: "sales", permission: "sales.invoice.create" },
  { key: "new_quotation",    icon: ClipboardList, route: "/sales/quotations/new",      group: "sales", permission: "sales.quotation.create" },
  { key: "new_receipt",      icon: Receipt,       route: "/sales/receipts?new=1",      group: "sales", permission: "collect" },
  { key: "new_credit_note",  icon: FileMinus,     route: "/sales/credit-notes?new=1",  group: "sales", permission: "return" },
  { key: "new_debit_note",   icon: FilePlus,      route: "/sales/debit-notes?new=1",   group: "sales", permission: "return" },

  // ── Inventory ───────────────────────────────────────────────
  { key: "new_item",         icon: PackagePlus,       route: "/inventory/items?new=1",        group: "inventory", permission: "inventory.item.create" },
  { key: "new_category",     icon: FolderPlus,        route: "/inventory/categories?new=1",   group: "inventory", permission: "inventory.category.manage" },
  { key: "new_price_list",   icon: Tag,               route: "/inventory/price-lists?new=1",  group: "inventory", permission: "inventory.pricelist.manage" },
  { key: "new_warehouse",    icon: Warehouse,         route: "/inventory/warehouses?new=1",   group: "inventory", permission: "inventory.warehouse.manage" },
  { key: "new_stocktake",    icon: ClipboardCheck,    route: "/inventory/stocktakes?new=1",   group: "inventory", permission: "inventory.stocktake.create" },
  { key: "new_transfer",     icon: ArrowLeftRight,    route: "/inventory/transfers?new=1",    group: "inventory", permission: "inventory.transfer.create" },
  { key: "new_adjustment",   icon: SlidersHorizontal, route: "/inventory/adjustments?new=1",  group: "inventory", permission: "inventory.adjustment.create" },

  // ── Purchasing ──────────────────────────────────────────────
  { key: "new_purchase_invoice", icon: FileText,        route: "/purchasing/invoices/new",   group: "purchasing", permission: "purchasing.invoice.create" },
  { key: "new_purchase_order",   icon: ShoppingBag,      route: "/purchasing/orders?new=1",   group: "purchasing", permission: "purchasing.order.create" },
  { key: "new_supplier",         icon: Building2,        route: "/purchasing/suppliers?new=1",group: "purchasing", permission: "purchasing.supplier.create" },
  { key: "new_purchase_return",  icon: RotateCcw,        route: "/purchasing/returns?new=1",  group: "purchasing", permission: "purchasing.return.create" },
  { key: "new_purchase_voucher", icon: ArrowDownToLine,  route: "/purchasing/vouchers?new=1", group: "purchasing", permission: "purchasing.payment.create" },

  // ── Accounting ──────────────────────────────────────────────
  { key: "new_expense",          icon: CreditCard,      route: "/finance/expenses?new=1",   group: "accounting", permission: "finance.expense.create" },
  { key: "new_receipt_voucher",  icon: HandCoins,       route: "/finance/receipts?new=1",   group: "accounting", permission: "finance.receipt.create" },
  { key: "new_payment_voucher",  icon: ArrowDownToLine, route: "/finance/payments?new=1",   group: "accounting", permission: "finance.payment.create" },
  { key: "new_fin_transfer",     icon: ArrowLeftRight,  route: "/finance/transfers?new=1",  group: "accounting", permission: "finance.transfer.create" },
  { key: "new_treasury",         icon: Wallet,          route: "/finance/treasuries?new=1", group: "accounting", permission: "finance.treasury.create" },
  { key: "new_journal_entry",    icon: BookOpen,        route: "/finance/journal?new=1",    group: "accounting", permission: "finance.journal.create" },
  { key: "new_account",          icon: ListTree,        route: "/finance/coa?new=1",        group: "accounting", permission: "finance.coa.create" },

  // ── Customers (CRM) ─────────────────────────────────────────
  { key: "new_customer",      icon: UserRound,     route: "/customers/list?new=1",          group: "customers", permission: "crm.customer.create" },
  { key: "new_follow_up",     icon: CalendarClock, route: "/customers/follow-ups?new=1",    group: "customers", permission: "crm.followup.create" },
  { key: "new_segment",       icon: Layers,        route: "/customers/segments?new=1",      group: "customers", permission: "crm.segment.create" },
  { key: "new_communication", icon: MessageSquare, route: "/customers/communications?new=1",group: "customers", permission: "crm.communication.create" },

  // ── HR ──────────────────────────────────────────────────────
  { key: "new_employee",     icon: UserPlus,   route: "/hr/employees?new=1", group: "hr", permission: "hr.employee.create" },
  { key: "new_advance",      icon: Banknote,   route: "/hr/advances?new=1",  group: "hr", permission: "hr.advance.create" },
  { key: "new_payroll_run",  icon: PlayCircle, route: "/hr/payroll?new=1",   group: "hr", permission: "hr.payroll.run" },

  // ── Reports ─────────────────────────────────────────────────
  { key: "new_schedule", icon: CalendarClock, route: "/reports/scheduling?new=1", group: "reports", permission: "reports.schedules.create" },

  // ── Admin (permissions) ──────────────────────────────────────
  { key: "new_user",   icon: UserPlus, route: "/admin/users?new=1",    group: "permissions", permission: "admin.user.manage" },
  { key: "new_branch", icon: Building, route: "/admin/branches?new=1", group: "permissions", permission: "admin.branch.manage" },
];
