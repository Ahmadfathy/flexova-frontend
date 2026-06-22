import { useTranslation } from "react-i18next";
import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";

import { FinanceDashboardPage as _Dashboard }   from "./dashboard/FinanceDashboardPage";
import { TreasuriesPage as _Treasuries }        from "./treasuries/TreasuriesPage";
import { ExpensesPage as _Expenses }            from "./expenses/ExpensesPage";
import { ReceiptVouchersPage as _Receipts }     from "./receipts/ReceiptVouchersPage";
import { PaymentVouchersPage as _Payments }     from "./payments/PaymentVouchersPage";
import { TransfersPage as _Transfers }          from "./transfers/TransfersPage";

function Stub({ k }: { k: string }) {
  const { t } = useTranslation("finance");
  return (
    <>
      <PageHeader title={t(`${k}.title` as Parameters<typeof t>[0])} />
      <PageSection><EmptyState /></PageSection>
    </>
  );
}

export const FinanceDashboardPage  = _Dashboard;
export const TreasuriesPage        = _Treasuries;
export const ExpensesPage          = _Expenses;
export const ReceiptVouchersPage   = _Receipts;
export const PaymentVouchersPage   = _Payments;
export const FinanceTransfersPage  = _Transfers;
export const JournalPage           = () => <Stub k="journal" />;
export const CoaPage               = () => <Stub k="coa" />;
export const TrialBalancePage      = () => <Stub k="trial_balance" />;
export const StatementsPage        = () => <Stub k="statements" />;
export const ReconciliationPage    = () => <Stub k="reconciliation" />;
export const ClosingPage           = () => <Stub k="closing" />;
