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

// Play — FE_15 — back-office settings (standard shell, not PosLayout)
const PlayDeviceTypesPage = lazy(() => import("@/features/play/settings/DeviceTypesPage"));
const PlayDevicesPage = lazy(() => import("@/features/play/settings/DevicesPage"));
const PlayRatePlansPage = lazy(() => import("@/features/play/settings/RatePlansPage"));
const PlayRatePlanEditorPage = lazy(() => import("@/features/play/settings/RatePlanEditorPage"));
const PlaySectorSettingsPage = lazy(() => import("@/features/play/settings/SectorSettingsPage"));
const PlaySessionLogPage = lazy(() => import("@/features/play/sessions/SessionLogPage"));

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
  InvoiceEditorPage, IssuedInvoicePage,
  QuotationEditorPage, EtaSettingsPage,
} from "@/features/sales/SalesPages";

// Purchasing
import { PurchasingLayout } from "@/features/purchasing/PurchasingLayout";
import {
  SuppliersPage, SupplierCard, PurchasesPage,
  PurchaseInvoiceEditor, PurchaseInvoiceView,
  OrdersPage, ReturnsPage, VouchersPage, InboundEtaHubPage,
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
import { EtaConnectorPlayground } from "@/features/dev/EtaConnectorPlayground";

// Retail POS — FE_09a layout frame + FE_09 cashier screen (§4)
import { PosLayout, PosGridPlaceholder } from "@/components/shell/pos/PosLayout";
import { PosExitTracker } from "@/components/shell/pos/PosExitTracker";
import CashierGridPage from "@/features/pos/CashierGridPage";
import CloseShiftPage from "@/features/pos/CloseShiftPage";
import PosJournalPage from "@/features/pos/JournalPage";
import PosSettingsPage from "@/features/pos/SettingsPage";

// F&B — FE_10 — reuses PosLayout (generic variant); Floor plan + Order this step
import FloorPlanPage from "@/features/fnb/FloorPlanPage";
import OrderPage from "@/features/fnb/OrderPage";
import KdsPage from "@/features/fnb/KdsPage";
import BillPage from "@/features/fnb/BillPage";

// Services & Appointments — FE_11 — reuses PosLayout (generic variant); narrow core complete
import CalendarPage from "@/features/svc/CalendarPage";
import ServiceTicketPage from "@/features/svc/ServiceTicketPage";
import SubscriptionsPage from "@/features/svc/SubscriptionsPage";

// Repair / Work Order — FE_12 — reuses PosLayout (generic variant); Step 1 scaffold (placeholders only)
import RepairBoardPage from "@/features/repair/RepairBoardPage";
import RepairIntakePage from "@/features/repair/RepairIntakePage";
import WorkOrderDetailPage from "@/features/repair/WorkOrderDetailPage";
import RepairSettingsPage from "@/features/repair/RepairSettingsPage";

// Play (time-based) — FE_15 — reuses PosLayout (generic variant); Floor Grid (§4) this step
import FloorGridPage from "@/features/play/floor/FloorGridPage";
import { PlaySyncIndicator } from "@/components/play/PlaySyncIndicator";

// Wholesale & Distribution — FE_13 — scaffold only (routes + placeholders, no UI logic yet)
import { WholesaleLayout } from "@/features/wholesale/WholesaleLayout";
import {
  OrdersListPage, OrderEditorPage, OrderViewPage, OrderPickPage,
  DeliveriesListPage, DeliveryViewPage, RoutesListPage, RouteEditorPage,
  RepsBoardPage, RepDetailPage, CreditHubPage, VanLoadsListPage, VanLoadDetailPage,
  PriceTiersEditorPage,
} from "@/features/wholesale/WholesalePages";
import {
  VanShiftOpenPage, VanTodayPage, VanVisitPage, VanCollectPage, VanShiftClosePage,
} from "@/features/wholesale/van/VanPages";
import { SyncIndicator } from "@/components/van/SyncIndicator";

// Manufacturing — FE_14 — scaffold only (routes + placeholders, no UI logic yet)
import { MfgLayout } from "@/features/mfg/MfgLayout";
import {
  MfgDashboardPage, MoListPage, MoEditorPage, MoDetailPage, BomListPage, BomEditorPage,
} from "@/features/mfg/MfgPages";

// Project-Based Services — FE_16 — scaffold only (routes + placeholders, no UI logic yet)
import { ProjectsLayout } from "@/features/projects/ProjectsLayout";
import {
  ProjectsListPage, ProjectEditorPage, BillingHubPage, PersonalTimePage, TimeApprovalsPage,
  ProjectDetailLayout, ProjectOverviewPage, ProjectMilestonesPage, ProjectTimePage,
  ProjectInvoicesPage, ProjectDocumentsPage, ProjectAppointmentsPage, ProjectTeamPage,
} from "@/features/projects/ProjectsPages";

// Construction / Contracting — FE_17 — facet on FE_16 project workspace (Step 0: flag + S1 only, rest scaffolded)
import {
  BoqEditorPage, ContractTermsPage, VariationOrdersPage, VariationOrderEditorPage,
  ClaimsRegisterPage, ClaimEditorPage, ClaimViewPage, RetentionPage,
  SubcontractsListPage, SubcontractDetailPage, ProfitabilityPage,
} from "@/features/construction/ConstructionPages";
import { ConstructionGuard } from "@/features/construction/ConstructionGuard";

// Healthcare — FE_18 — back-office (standard shell). Today Board this step (Prompt 1);
// patients/encounter/lab/insurance/catalog are routed placeholders, built in later prompts.
import { HealthcareLayout } from "@/features/healthcare/HealthcareLayout";
import {
  TodayBoardPage, PatientsListPage, PatientNewPage, Patient360Page,
  EncounterPage, LabQueuePage, InsurancePage, CatalogPage,
} from "@/features/healthcare/HealthcarePages";

// E-commerce Admin — FE_21 — back-office (standard shell). Orders (list+detail)
// this step (Admin Prompt A1); products/categories/affiliates/settings are
// routed placeholders, built in later prompts.
import { EcommerceLayout } from "@/features/ecommerce/EcommerceLayout";
import {
  OrdersListPage as EcOrdersListPage, OrderDetailPage as EcOrderDetailPage,
  ProductsPage as EcProductsPage, CategoriesPage as EcCategoriesPage,
  AffiliatesPage as EcAffiliatesPage, SettingsPaymentsPage as EcSettingsPaymentsPage,
  SettingsStorePage as EcSettingsStorePage,
} from "@/features/ecommerce/EcommercePages";

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
      <PosExitTracker />
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

        {/* Retail POS — FE_09a — dedicated layout, not AppShell */}
        <Route path="/pos/*" element={<PosLayout />}>
          <Route index element={<Navigate to="register" replace />} />
          <Route path="register" element={<CashierGridPage />} />
          <Route path="shift/close" element={<CloseShiftPage />} />
          <Route path="journal" element={<PosJournalPage />} />
          <Route path="settings" element={<PosSettingsPage />} />
          <Route path="*" element={<PosGridPlaceholder />} />
        </Route>

        {/* F&B — FE_10 — reuses PosLayout (generic body: no POS rail/ticket).
            Journal/settings/shift are reused via the shared /pos/* routes
            (top-bar Journal/Terminal icons already navigate there). */}
        <Route path="/fnb/*" element={<PosLayout variant="generic" />}>
          <Route index element={<Navigate to="floor" replace />} />
          <Route path="floor" element={<FloorPlanPage />} />
          <Route path="order/:checkId" element={<OrderPage />} />
          <Route path="kds" element={<KdsPage />} />
          <Route path="kds/:stationId" element={<KdsPage />} />
          <Route path="bill/:checkId" element={<BillPage />} />
        </Route>

        {/* Services & Appointments — FE_11 — reuses PosLayout (generic body).
            Journal/settings/shift/tender are reused via the shared /pos/* routes. */}
        <Route path="/svc/*" element={<PosLayout variant="generic" />}>
          <Route index element={<Navigate to="calendar" replace />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="ticket/:id" element={<ServiceTicketPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
        </Route>

        {/* Repair / Work Order — FE_12 — reuses PosLayout (generic body).
            Settings (/repair/settings) is back-office and mounted separately below,
            under AppShell — it is a static path so it outranks the ":id" splat here. */}
        <Route path="/repair/*" element={<PosLayout variant="generic" />}>
          <Route index element={<Navigate to="board" replace />} />
          <Route path="board" element={<RepairBoardPage />} />
          <Route path="new" element={<RepairIntakePage />} />
          <Route path=":id" element={<WorkOrderDetailPage />} />
        </Route>

        {/* Play (time-based) — FE_15 — reuses PosLayout (generic body). Bare `/play` is the
            Floor Grid itself (FE_15 §2 IA); `/play/sessions` (back-office log, §9) is mounted
            separately below under AppShell — same precedent as `/repair/settings`, a static
            path that outranks this block's own `/play/*` splat. */}
        <Route path="/play/*" element={<PosLayout variant="generic" syncIndicator={<PlaySyncIndicator />} />}>
          <Route index element={<FloorGridPage />} />
        </Route>

        {/* Wholesale & Distribution — FE_13 — van field screens reuse PosLayout (generic body),
            route-scoped, tablet-first. Back-office screens are mounted under AppShell below. */}
        <Route path="/van/*" element={<PosLayout variant="generic" syncIndicator={<SyncIndicator />} />}>
          <Route index element={<Navigate to="today" replace />} />
          <Route path="shift/open" element={<VanShiftOpenPage />} />
          <Route path="today" element={<VanTodayPage />} />
          <Route path="visit/:visitId" element={<VanVisitPage />} />
          <Route path="customer/:id/collect" element={<VanCollectPage />} />
          <Route path="shift/close" element={<VanShiftClosePage />} />
        </Route>

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
            <Route path="invoices/:id"     element={<IssuedInvoicePage />} />
            <Route path="quotations"        element={<QuotationsPage />} />
            <Route path="quotations/new"   element={<QuotationEditorPage />} />
            <Route path="quotations/:id"   element={<QuotationEditorPage />} />
            <Route path="credit-notes"     element={<CreditNotesPage />} />
            <Route path="debit-notes"      element={<DebitNotesPage />} />
            <Route path="receipts"         element={<ReceiptsPage />} />
            <Route path="eta-hub"          element={<EtaHubPage />} />
            <Route path="settings/eta"     element={<EtaSettingsPage />} />
          </Route>

          {/* Purchasing — FE_03 */}
          <Route path="/purchasing" element={<PurchasingLayout />}>
            <Route index element={<Navigate to="suppliers" replace />} />
            <Route path="suppliers"       element={<SuppliersPage />} />
            <Route path="suppliers/:id"  element={<SupplierCard />} />
            <Route path="invoices"        element={<PurchasesPage />} />
            <Route path="invoices/new"    element={<PurchaseInvoiceEditor />} />
            <Route path="invoices/:id"    element={<PurchaseInvoiceView />} />
            <Route path="orders"          element={<OrdersPage />} />
            <Route path="returns"         element={<ReturnsPage />} />
            <Route path="returns/new"     element={<ReturnsPage />} />
            <Route path="vouchers"        element={<VouchersPage />} />
            <Route path="vouchers/new"    element={<VouchersPage />} />
            <Route path="inbound-eta"     element={<InboundEtaHubPage />} />
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

          {/* Repair / Work Order — FE_12 — Workshop settings is back-office (spec §7), not PosLayout */}
          <Route path="/repair/settings" element={<RepairSettingsPage />} />

          {/* Play (time-based) — FE_15 — Session log is back-office (spec §9), not PosLayout */}
          <Route
            path="/play/sessions"
            element={
              <Suspense fallback={<PageFallback />}>
                <PlaySessionLogPage />
              </Suspense>
            }
          />

          {/* Wholesale & Distribution — FE_13 — back-office (standard shell) */}
          <Route path="/wholesale" element={<WholesaleLayout />}>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders"          element={<OrdersListPage />} />
            <Route path="orders/new"      element={<OrderEditorPage />} />
            <Route path="orders/:id"      element={<OrderViewPage />} />
            <Route path="orders/:id/pick" element={<OrderPickPage />} />
            <Route path="deliveries"      element={<DeliveriesListPage />} />
            <Route path="deliveries/:id"  element={<DeliveryViewPage />} />
            <Route path="routes"          element={<RoutesListPage />} />
            <Route path="routes/:id"      element={<RouteEditorPage />} />
            <Route path="reps"            element={<RepsBoardPage />} />
            <Route path="reps/:id"        element={<RepDetailPage />} />
            <Route path="credit"          element={<CreditHubPage />} />
            <Route path="van-loads"       element={<VanLoadsListPage />} />
            <Route path="van-loads/:id"   element={<VanLoadDetailPage />} />
          </Route>

          {/* Manufacturing — FE_14 — back-office (standard shell) */}
          <Route path="/mfg" element={<MfgLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"   element={<MfgDashboardPage />} />
            <Route path="orders"      element={<MoListPage />} />
            <Route path="orders/new"  element={<MoEditorPage />} />
            <Route path="orders/:id"  element={<MoDetailPage />} />
            <Route path="bom"         element={<BomListPage />} />
            <Route path="bom/new"     element={<BomEditorPage />} />
            <Route path="bom/:id"     element={<BomEditorPage />} />
          </Route>

          {/* Project-Based Services — FE_16 — back-office (standard shell, not PosLayout) */}
          <Route path="/projects" element={<ProjectsLayout />}>
            <Route index          element={<ProjectsListPage />} />
            <Route path="new"     element={<ProjectEditorPage />} />
            <Route path="billing" element={<BillingHubPage />} />
            <Route path=":id" element={<ProjectDetailLayout />}>
              <Route index                element={<ProjectOverviewPage />} />
              <Route path="milestones"    element={<ProjectMilestonesPage />} />
              <Route path="time"          element={<ProjectTimePage />} />
              <Route path="invoices"      element={<ProjectInvoicesPage />} />
              <Route path="documents"     element={<ProjectDocumentsPage />} />
              <Route path="appointments"  element={<ProjectAppointmentsPage />} />
              <Route path="team"          element={<ProjectTeamPage />} />
              {/* Construction facet routes (FE_17) — guarded: redirects to Overview unless construction.enabled + mode="construction" */}
              <Route element={<ConstructionGuard />}>
                <Route path="boq"                element={<BoqEditorPage />} />
                <Route path="contract"           element={<ContractTermsPage />} />
                <Route path="variations"         element={<VariationOrdersPage />} />
                <Route path="variations/:vo"     element={<VariationOrderEditorPage />} />
                <Route path="claims"             element={<ClaimsRegisterPage />} />
                <Route path="claims/new"         element={<ClaimEditorPage />} />
                <Route path="claims/:claim"      element={<ClaimViewPage />} />
                <Route path="retention"          element={<RetentionPage />} />
                <Route path="subcontracts"       element={<SubcontractsListPage />} />
                <Route path="subcontracts/:sc"   element={<SubcontractDetailPage />} />
                <Route path="profitability"      element={<ProfitabilityPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="/time"           element={<PersonalTimePage />} />
          <Route path="/time/approvals" element={<TimeApprovalsPage />} />

          {/* Healthcare — FE_18 — back-office (standard shell) */}
          <Route path="/healthcare" element={<HealthcareLayout />}>
            <Route index element={<Navigate to="today" replace />} />
            <Route path="today"          element={<TodayBoardPage />} />
            <Route path="patients"       element={<PatientsListPage />} />
            <Route path="patients/new"   element={<PatientNewPage />} />
            <Route path="patients/:id"   element={<Patient360Page />} />
            <Route path="lab"            element={<LabQueuePage />} />
            <Route path="insurance"      element={<InsurancePage />} />
            <Route path="catalog"        element={<CatalogPage />} />
          </Route>
          <Route path="/healthcare/encounter/:id" element={<EncounterPage />} />

          {/* E-commerce Admin — FE_21 — back-office (standard shell) */}
          <Route path="/ecommerce" element={<EcommerceLayout />}>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders"                element={<EcOrdersListPage />} />
            <Route path="orders/:id"            element={<EcOrderDetailPage />} />
            <Route path="products"              element={<EcProductsPage />} />
            <Route path="categories"            element={<EcCategoriesPage />} />
            <Route path="affiliates"            element={<EcAffiliatesPage />} />
            <Route path="settings/payments"     element={<EcSettingsPaymentsPage />} />
            <Route path="settings/store"        element={<EcSettingsStorePage />} />
          </Route>

          {/* Price tiers editor — extends FE_01 price lists (spec §11), standalone path */}
          <Route path="/pricing/lists/:id" element={<PriceTiersEditorPage />} />

          {/* Dev tools — pattern library preview */}
          <Route path="/dev/patterns" element={<PatternsPage />} />
          <Route path="/dev/eta-connector" element={<EtaConnectorPlayground />} />

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
            <Route
              path="play/device-types"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PlayDeviceTypesPage />
                </Suspense>
              }
            />
            <Route
              path="play/devices"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PlayDevicesPage />
                </Suspense>
              }
            />
            <Route
              path="play/rate-plans"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PlayRatePlansPage />
                </Suspense>
              }
            />
            <Route
              path="play/rate-plans/new"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PlayRatePlanEditorPage />
                </Suspense>
              }
            />
            <Route
              path="play/rate-plans/:id"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PlayRatePlanEditorPage />
                </Suspense>
              }
            />
            <Route
              path="play"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PlaySectorSettingsPage />
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
