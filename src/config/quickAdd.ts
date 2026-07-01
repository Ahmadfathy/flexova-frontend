import type { LucideIcon } from "lucide-react";
import {
  FileText, ClipboardList,
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
  { key: "new_invoice",     icon: FileText,      route: "/sales/invoices/new",       group: "sales",       permission: "sales.invoice.create" },
  { key: "new_quotation",   icon: ClipboardList, route: "/sales/quotations/new",     group: "sales",       permission: "sales.quotation.create" },

  // ── Purchasing ──────────────────────────────────────────────
  { key: "new_purchase_invoice", icon: FileText, route: "/purchasing/invoices/new", group: "purchasing",  permission: "purchasing.invoice.create" },
];
