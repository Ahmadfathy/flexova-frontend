import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { AuthGuard } from "@/components/shell/AuthGuard";
import { Skeleton } from "@/components/patterns/Skeletons";

// Auth
import { AuthLayout }          from "@/features/auth/AuthLayout";
import { LoginPage }           from "@/features/auth/LoginPage";
import { ForgotPasswordPage }  from "@/features/auth/ForgotPasswordPage";
import { ResetPasswordPage }   from "@/features/auth/ResetPasswordPage";
import { TwoFAPage }           from "@/features/auth/TwoFAPage";
import { SetPasswordPage }     from "@/features/auth/SetPasswordPage";

// Error pages
import { NotFoundPage }    from "@/features/errors/NotFoundPage";
import { ForbiddenPage }   from "@/features/errors/ForbiddenPage";
import { ServerErrorPage } from "@/features/errors/ServerErrorPage";
import { OfflinePage }     from "@/features/errors/OfflinePage";

// Dashboard
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));

// Settings
const AppearanceSettingsPage = lazy(() =>
  import("@/features/settings/AppearanceSettings").then(m => ({ default: m.AppearanceSettings }))
);

// Inventory
import { InventoryLayout } from "@/features/inventory/InventoryLayout";
import {
  ItemsPage, CategoriesPage, PriceListsPage, PriceListEditorPage, WarehousesPage,
  StocktakesPage, StocktakeEditorPage, TransfersPage, AdjustmentsPage, LowStockPage,
} from "@/features/inventory/InventoryPages";

// Sales
import { SalesLayout } from "@/features/sales/SalesLayout";
import {
  InvoicesPage, QuotationsPage, CreditNotesPage,
  DebitNotesPage, ReceiptsPage, EtaHubPage,
  InvoiceEditorPage,
} from "@/features/sales/SalesPages";

// Purchasing
import { PurchasingLayout } from "@/features/purchasing/PurchasingLayout";
import {
  SuppliersPage, PurchasesPage, OrdersPage,
  ReturnsPage, VouchersPage, InboundEtaPage,
} from "@/features/purchasing/PurchasingPages";

// Finance
import { FinanceLayout } from "@/features/finance/FinanceLayout";
import {
  FinanceDashboardPage, TreasuriesPage, ExpensesPage,
  ReceiptVouchersPage, PaymentVouchersPage, FinanceTransfersPage,
  JournalPage, CoaPage, TrialBalancePage,
  StatementsPage, ReconciliationPage, ClosingPage,
} from "@/features/finance/FinancePages";

// CRM
import { CrmLayout } from "@/features/crm/CrmLayout";
import {
  CustomersListPage, FollowUpsPage, SegmentsPage, CommunicationsPage,
} from "@/features/crm/CrmPages";

// HR
import { HrLayout } from "@/features/hr/HrLayout";
import {
  HrDashboardPage, EmployeesPage, AttendancePage,
  AdvancesPage, PayrollPage, CommissionsPage,
} from "@/features/hr/HrPages";

// Reports
import { ReportsLayout } from "@/features/reports/ReportsLayout";
import {
  ReportsDashboardPage, ReportLibraryPage, SavedReportsPage,
  EtaTaxPage, ZReportPage, SchedulingPage,
} from "@/features/reports/ReportsPages";

// Admin
import { AdminLayout } from "@/features/admin/AdminLayout";
import {
  UsersPage, RolesPage, BranchesPage, SecurityPage, AuditPage,
} from "@/features/admin/AdminPages";

// Dev tools
import { PatternsPage } from "@/features/dev/PatternsPage";

import { Toaster } from "@/components/ui/sonner";

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Auth pages (no shell) ─────────────────────────── */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route index element={<Navigate to="login" replace />} />
          <Route path="login"           element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password"  element={<ResetPasswordPage />} />
          <Route path="2fa"             element={<TwoFAPage />} />
          <Route path="set-password"    element={<SetPasswordPage />} />
        </Route>

        {/* ── Standalone error pages (no shell) ───────────────── */}
        <Route path="/403"     element={<ForbiddenPage />} />
        <Route path="/500"     element={<ServerErrorPage />} />
        <Route path="/offline" element={<OfflinePage />} />

        {/* ── Authenticated app (guarded shell) ───────────────── */}
        <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>

          {/* Dashboard */}
          <Route
            index
            element={
              <Suspense fallback={<PageFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />

          {/* Inventory — FE_01 */}
          <Route path="/inventory" element={<InventoryLayout />}>
            <Route index element={<Navigate to="items" replace />} />
            <Route path="items"       element={<ItemsPage />} />
            <Route path="categories"  element={<CategoriesPage />} />
            <Route path="price-lists"        element={<PriceListsPage />} />
            <Route path="price-lists/:id"   element={<PriceListEditorPage />} />
            <Route path="warehouses"         element={<WarehousesPage />} />
            <Route path="stocktakes"         element={<StocktakesPage />} />
            <Route path="stocktakes/:id"    element={<StocktakeEditorPage />} />
            <Route path="transfers"   element={<TransfersPage />} />
            <Route path="adjustments" element={<AdjustmentsPage />} />
            <Route path="low-stock"   element={<LowStockPage />} />
          </Route>

          {/* Sales — FE_02 */}
          <Route path="/sales" element={<SalesLayout />}>
            <Route index element={<Navigate to="invoices" replace />} />
            <Route path="invoices"         element={<InvoicesPage />} />
            <Route path="invoices/new"     element={<InvoiceEditorPage />} />
            <Route path="invoices/:id"     element={<InvoiceEditorPage />} />
            <Route path="quotations"       element={<QuotationsPage />} />
            <Route path="credit-notes"     element={<CreditNotesPage />} />
            <Route path="debit-notes"      element={<DebitNotesPage />} />
            <Route path="receipts"         element={<ReceiptsPage />} />
            <Route path="eta-hub"          element={<EtaHubPage />} />
          </Route>

          {/* Purchasing — FE_03 */}
          <Route path="/purchasing" element={<PurchasingLayout />}>
            <Route index element={<Navigate to="suppliers" replace />} />
            <Route path="suppliers"   element={<SuppliersPage />} />
            <Route path="invoices"    element={<PurchasesPage />} />
            <Route path="orders"      element={<OrdersPage />} />
            <Route path="returns"     element={<ReturnsPage />} />
            <Route path="vouchers"    element={<VouchersPage />} />
            <Route path="inbound-eta" element={<InboundEtaPage />} />
          </Route>

          {/* Finance — FE_04 */}
          <Route path="/finance" element={<FinanceLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"     element={<FinanceDashboardPage />} />
            <Route path="treasuries"    element={<TreasuriesPage />} />
            <Route path="expenses"      element={<ExpensesPage />} />
            <Route path="receipts"      element={<ReceiptVouchersPage />} />
            <Route path="payments"      element={<PaymentVouchersPage />} />
            <Route path="transfers"     element={<FinanceTransfersPage />} />
            <Route path="journal"       element={<JournalPage />} />
            <Route path="coa"           element={<CoaPage />} />
            <Route path="trial-balance" element={<TrialBalancePage />} />
            <Route path="statements"    element={<StatementsPage />} />
            <Route path="reconciliation" element={<ReconciliationPage />} />
            <Route path="closing"       element={<ClosingPage />} />
          </Route>

          {/* CRM — FE_05 */}
          <Route path="/customers" element={<CrmLayout />}>
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list"           element={<CustomersListPage />} />
            <Route path="follow-ups"     element={<FollowUpsPage />} />
            <Route path="segments"       element={<SegmentsPage />} />
            <Route path="communications" element={<CommunicationsPage />} />
          </Route>

          {/* HR — FE_06 */}
          <Route path="/hr" element={<HrLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<HrDashboardPage />} />
            <Route path="employees"  element={<EmployeesPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="advances"   element={<AdvancesPage />} />
            <Route path="payroll"    element={<PayrollPage />} />
            <Route path="commissions" element={<CommissionsPage />} />
          </Route>

          {/* Reports — FE_07 */}
          <Route path="/reports" element={<ReportsLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<ReportsDashboardPage />} />
            <Route path="library"    element={<ReportLibraryPage />} />
            <Route path="saved"      element={<SavedReportsPage />} />
            <Route path="eta-tax"    element={<EtaTaxPage />} />
            <Route path="z-report"   element={<ZReportPage />} />
            <Route path="scheduling" element={<SchedulingPage />} />
          </Route>

          {/* Admin — FE_08 */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users"    element={<UsersPage />} />
            <Route path="roles"    element={<RolesPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="audit"    element={<AuditPage />} />
          </Route>

          {/* Dev tools — pattern library preview */}
          <Route path="/dev/patterns" element={<PatternsPage />} />

          {/* Settings */}
          <Route path="/settings">
            <Route index element={
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                {/* redirect to appearance by default */}
              </div>
            } />
            <Route
              path="appearance"
              element={
                <Suspense fallback={<PageFallback />}>
                  <AppearanceSettingsPage />
                </Suspense>
              }
            />
          </Route>

        </Route>
        </Route> {/* end AuthGuard */}

        {/* ── 404 catch-all ───────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
      <Toaster position="bottom-center" />
    </BrowserRouter>
  );
}
