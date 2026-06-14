import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";

function Page({ k }: { k: string }) {
  const { t } = useTranslation("sales");
  return (
    <>
      <PageHeader title={t(`${k}.title`)} />
      <EmptyState />
    </>
  );
}

export const InvoicesPage    = () => <Page k="invoices" />;
export const QuotationsPage  = () => <Page k="quotations" />;
export const CreditNotesPage = () => <Page k="credit_notes" />;
export const DebitNotesPage  = () => <Page k="debit_notes" />;
export const ReceiptsPage    = () => <Page k="receipts" />;
export const EtaHubPage      = () => <Page k="eta_hub" />;
