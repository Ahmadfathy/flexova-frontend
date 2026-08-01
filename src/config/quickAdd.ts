import type { LucideIcon } from "lucide-react";
import {
  FileText, ClipboardList, Receipt, FileMinus, FilePlus,
  PackagePlus, FolderPlus, Tag, Warehouse, ClipboardCheck, ArrowLeftRight, SlidersHorizontal,
  ShoppingBag, Building2, RotateCcw, ArrowDownToLine,
  CreditCard, HandCoins, Wallet, BookOpen, ListTree,
  UserRound, CalendarClock, Layers, MessageSquare,
  UserPlus, Banknote, PlayCircle,
  Building, Timer,
} from "lucide-react";

export interface QuickAddAction {
  key: string;          // unique id; also used as i18n subkey: shell "quick_add.<key>"
  icon: LucideIcon;
  group: string;         // MENU item key — determines which module group this belongs to
  permission?: string;   // plugged into FE_08 can(permission)
  moduleFlag?: string;   // module-entitlement check
  method: "modal" | "drawer" | "page";
  /** Required when method === "page": the route Quick-Add navigates to. */
  route?: string;
}

/**
 * Create-actions registry.
 * Every entry here is a real "create a new record" affordance that exists
 * somewhere in the app today, mirroring that entity's own "+ new" flow:
 *   - method: "modal" | "drawer" — opened in place via the global create
 *     dispatcher (see src/stores/createDispatcher.ts + GlobalCreateModals),
 *     registered under the same `key` in GlobalCreateModals.tsx. No navigation.
 *   - method: "page" — Quick-Add navigates to `route` (a dedicated editor page).
 *
 * Ordered within each group by UX priority (most-common first).
 * Group order follows MENU order automatically (useQuickAddGroups in QuickAdd.tsx).
 *
 * To add a new action: push an entry here + add the i18n key to shell.json
 * (+ register the modal/drawer component in GlobalCreateModals.tsx for modal/drawer entries).
 * To remove an action for a role: wire `permission` to FE_08 can().
 */
export const QUICK_ADD: QuickAddAction[] = [
  // ── Sales ──────────────────────────────────────────────────
  { key: "new_invoice",      icon: FileText,      method: "page",   route: "/sales/invoices/new",     group: "sales", permission: "sales.invoice.create" },
  { key: "new_quotation",    icon: ClipboardList, method: "page",   route: "/sales/quotations/new",   group: "sales", permission: "sales.quotation.create" },
  { key: "new_receipt",      icon: Receipt,       method: "drawer", group: "sales", permission: "collect" },
  { key: "new_credit_note",  icon: FileMinus,     method: "drawer", group: "sales", permission: "return" },
  { key: "new_debit_note",   icon: FilePlus,      method: "drawer", group: "sales", permission: "return" },

  // ── Inventory ───────────────────────────────────────────────
  { key: "new_item",         icon: PackagePlus,       method: "modal",  group: "inventory", permission: "inventory.item.create" },
  { key: "new_category",     icon: FolderPlus,        method: "modal",  group: "inventory", permission: "inventory.category.manage" },
  { key: "new_price_list",   icon: Tag,               method: "modal",  group: "inventory", permission: "inventory.pricelist.manage" },
  { key: "new_warehouse",    icon: Warehouse,         method: "modal",  group: "inventory", permission: "inventory.warehouse.manage" },
  { key: "new_stocktake",    icon: ClipboardCheck,    method: "modal",  group: "inventory", permission: "inventory.stocktake.create" },
  { key: "new_transfer",     icon: ArrowLeftRight,    method: "drawer", group: "inventory", permission: "inventory.transfer.create" },
  { key: "new_adjustment",   icon: SlidersHorizontal, method: "drawer", group: "inventory", permission: "inventory.adjustment.create" },

  // ── Purchasing ──────────────────────────────────────────────
  { key: "new_purchase_invoice", icon: FileText,        method: "page",  route: "/purchasing/invoices/new", group: "purchasing", permission: "purchasing.invoice.create" },
  { key: "new_purchase_order",   icon: ShoppingBag,      method: "modal", group: "purchasing", permission: "purchasing.order.create" },
  { key: "new_supplier",         icon: Building2,        method: "modal", group: "purchasing", permission: "purchasing.supplier.create" },
  { key: "new_purchase_return",  icon: RotateCcw,        method: "modal", group: "purchasing", permission: "purchasing.return.create" },
  { key: "new_purchase_voucher", icon: ArrowDownToLine,  method: "modal", group: "purchasing", permission: "purchasing.payment.create" },

  // ── Accounting ──────────────────────────────────────────────
  { key: "new_expense",          icon: CreditCard,      method: "modal", group: "accounting", permission: "finance.expense.create" },
  { key: "new_receipt_voucher",  icon: HandCoins,       method: "modal", group: "accounting", permission: "finance.receipt.create" },
  { key: "new_payment_voucher",  icon: ArrowDownToLine, method: "modal", group: "accounting", permission: "finance.payment.create" },
  { key: "new_fin_transfer",     icon: ArrowLeftRight,  method: "modal", group: "accounting", permission: "finance.transfer.create" },
  { key: "new_treasury",         icon: Wallet,          method: "modal", group: "accounting", permission: "finance.treasury.create" },
  { key: "new_journal_entry",    icon: BookOpen,        method: "modal", group: "accounting", permission: "finance.journal.create" },
  { key: "new_account",          icon: ListTree,        method: "modal", group: "accounting", permission: "finance.coa.create" },

  // ── Customers (CRM) ─────────────────────────────────────────
  { key: "new_customer",      icon: UserRound,     method: "modal", group: "customers", permission: "crm.customer.create" },
  { key: "new_follow_up",     icon: CalendarClock, method: "modal", group: "customers", permission: "crm.followup.create" },
  { key: "new_segment",       icon: Layers,        method: "modal", group: "customers", permission: "crm.segment.create" },
  { key: "new_communication", icon: MessageSquare, method: "modal", group: "customers", permission: "crm.communication.create" },

  // ── HR ──────────────────────────────────────────────────────
  { key: "new_employee",     icon: UserPlus,   method: "modal", group: "hr", permission: "hr.employee.create" },
  { key: "new_advance",      icon: Banknote,   method: "modal", group: "hr", permission: "hr.advance.create" },
  { key: "new_payroll_run",  icon: PlayCircle, method: "modal", group: "hr", permission: "hr.payroll.run" },

  // ── Project-Based Services ─────────────────────────────────
  { key: "new_timer", icon: Timer, method: "modal", group: "projects", permission: "projects.time.log", moduleFlag: "projects.enabled" },

  // ── Reports ─────────────────────────────────────────────────
  { key: "new_schedule", icon: CalendarClock, method: "modal", group: "reports", permission: "reports.schedules.create" },

  // ── Admin (permissions) ──────────────────────────────────────
  { key: "new_user",   icon: UserPlus, method: "modal", group: "permissions", permission: "admin.user.manage" },
  { key: "new_branch", icon: Building, method: "modal", group: "permissions", permission: "admin.branch.manage" },
];
