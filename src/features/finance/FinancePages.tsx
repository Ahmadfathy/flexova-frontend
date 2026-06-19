import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";

function Page({ k }: { k: string }) {
  const { t } = useTranslation("finance");
  return (
    <>
      <PageHeader title={t(`${k}.title`)} />
      <PageSection><EmptyState /></PageSection>
    </>
  );
}

export const FinanceDashboardPage  = () => <Page k="dashboard" />;
export const TreasuriesPage        = () => <Page k="treasuries" />;
export const ExpensesPage          = () => <Page k="expenses" />;
export const ReceiptVouchersPage   = () => <Page k="receipts" />;
export const PaymentVouchersPage   = () => <Page k="payments" />;
export const FinanceTransfersPage  = () => <Page k="transfers" />;
export const JournalPage           = () => <Page k="journal" />;
export const CoaPage               = () => <Page k="coa" />;
export const TrialBalancePage      = () => <Page k="trial_balance" />;
export const StatementsPage        = () => <Page k="statements" />;
export const ReconciliationPage    = () => <Page k="reconciliation" />;
export const ClosingPage           = () => <Page k="closing" />;
