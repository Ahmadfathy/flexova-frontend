import { lazy, Suspense, type ComponentType } from "react";
import { useCreateDispatcher } from "@/stores/createDispatcher";

interface CreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Registry of every modal/drawer "create new record" form, keyed by the
 * same entityKey used in src/config/quickAdd.ts. Lazy-loaded so only the
 * currently-open create form's chunk is ever fetched.
 */
const REGISTRY: Record<string, ComponentType<CreateModalProps>> = {
  // Sales
  new_receipt:      lazy(() => import("@/features/sales/receipts/ReceiptCreateDrawer").then(m => ({ default: m.ReceiptCreateDrawer }))),
  new_credit_note:  lazy(() => import("@/features/sales/credit-notes/CreditNoteCreateDrawer").then(m => ({ default: m.CreditNoteCreateDrawer }))),
  new_debit_note:   lazy(() => import("@/features/sales/debit-notes/DebitNoteCreateDrawer").then(m => ({ default: m.DebitNoteCreateDrawer }))),

  // Inventory
  new_item:         lazy(() => import("@/features/inventory/items/QuickAddModal").then(m => ({ default: m.QuickAddModal }))),
  new_category:     lazy(() => import("@/features/inventory/categories/CategoryCreateModal").then(m => ({ default: m.CategoryCreateModal }))),
  new_price_list:   lazy(() => import("@/features/inventory/price-lists/PriceListCreateModal").then(m => ({ default: m.PriceListCreateModal }))),
  new_warehouse:    lazy(() => import("@/features/inventory/warehouses/WarehouseCreateModal").then(m => ({ default: m.WarehouseCreateModal }))),
  new_stocktake:    lazy(() => import("@/features/inventory/stocktakes/NewStocktakeDialog").then(m => ({ default: m.NewStocktakeDialog }))),
  new_transfer:     lazy(() => import("@/features/inventory/transfers/NewTransferSheet").then(m => ({ default: m.NewTransferSheet }))),
  new_adjustment:   lazy(() => import("@/features/inventory/adjustments/NewAdjustmentSheet").then(m => ({ default: m.NewAdjustmentSheet }))),

  // Purchasing
  new_purchase_order:   lazy(() => import("@/features/purchasing/orders/PurchaseOrderCreateModal").then(m => ({ default: m.PurchaseOrderCreateModal }))),
  new_supplier:         lazy(() => import("@/features/purchasing/suppliers/SupplierCreateModal").then(m => ({ default: m.SupplierCreateModal }))),
  new_purchase_return:  lazy(() => import("@/features/purchasing/returns/PurchaseReturnCreateModal").then(m => ({ default: m.PurchaseReturnCreateModal }))),
  new_purchase_voucher: lazy(() => import("@/features/purchasing/vouchers/PurchaseVoucherCreateModal").then(m => ({ default: m.PurchaseVoucherCreateModal }))),

  // Accounting
  new_expense:         lazy(() => import("@/features/finance/expenses/ExpenseCreateModal").then(m => ({ default: m.ExpenseCreateModal }))),
  new_receipt_voucher: lazy(() => import("@/features/finance/receipts/ReceiptVoucherCreateModal").then(m => ({ default: m.ReceiptVoucherCreateModal }))),
  new_payment_voucher: lazy(() => import("@/features/finance/payments/PaymentVoucherCreateModal").then(m => ({ default: m.PaymentVoucherCreateModal }))),
  new_fin_transfer:    lazy(() => import("@/features/finance/transfers/TransferCreateModal").then(m => ({ default: m.TransferCreateModal }))),
  new_treasury:        lazy(() => import("@/features/finance/treasuries/TreasuryCreateModal").then(m => ({ default: m.TreasuryCreateModal }))),
  new_journal_entry:   lazy(() => import("@/features/finance/journal/JournalEntryCreateModal").then(m => ({ default: m.JournalEntryCreateModal }))),
  new_account:         lazy(() => import("@/features/finance/coa/AccountCreateModal").then(m => ({ default: m.AccountCreateModal }))),

  // Customers (CRM)
  new_customer:      lazy(() => import("@/features/crm/customers/CustomerCreateModal").then(m => ({ default: m.CustomerCreateModal }))),
  new_follow_up:     lazy(() => import("@/features/crm/follow-ups/FollowUpCreateModal").then(m => ({ default: m.FollowUpCreateModal }))),
  new_segment:       lazy(() => import("@/features/crm/segments/SegmentCreateModal").then(m => ({ default: m.SegmentCreateModal }))),
  new_communication: lazy(() => import("@/features/crm/communications/CommunicationCreateModal").then(m => ({ default: m.CommunicationCreateModal }))),

  // HR
  new_employee:    lazy(() => import("@/features/hr/employees/EmployeeCreateModal").then(m => ({ default: m.EmployeeCreateModal }))),
  new_advance:     lazy(() => import("@/features/hr/advances/AdvanceCreateModal").then(m => ({ default: m.AdvanceCreateModal }))),
  new_payroll_run: lazy(() => import("@/features/hr/payroll/PayrollRunCreateModal").then(m => ({ default: m.PayrollRunCreateModal }))),

  // Reports
  new_schedule: lazy(() => import("@/features/reports/scheduling/ScheduleCreateModal").then(m => ({ default: m.ScheduleCreateModal }))),

  // Admin
  new_user:   lazy(() => import("@/features/admin/users/UserInviteModal").then(m => ({ default: m.UserInviteModal }))),
  new_branch: lazy(() => import("@/features/admin/branches/BranchCreateModal").then(m => ({ default: m.BranchCreateModal }))),
};

/**
 * Mounted once at the app-shell level. Renders whichever create modal/drawer
 * is currently active in the global dispatcher, over whatever page happens
 * to be showing — so Quick-Add and each entity's own "+ New" button open the
 * exact same component in place, without navigation.
 */
export function GlobalCreateModals() {
  const activeKey = useCreateDispatcher(s => s.activeKey);
  const closeCreate = useCreateDispatcher(s => s.closeCreate);

  if (!activeKey) return null;
  const Component = REGISTRY[activeKey];
  if (!Component) return null;

  return (
    <Suspense fallback={null}>
      <Component open onOpenChange={o => !o && closeCreate()} />
    </Suspense>
  );
}
