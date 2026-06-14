import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";

function Page({ k }: { k: string }) {
  const { t } = useTranslation("crm");
  return (
    <>
      <PageHeader title={t(`${k}.title`)} />
      <EmptyState />
    </>
  );
}

export const CustomersListPage    = () => <Page k="list" />;
export const FollowUpsPage        = () => <Page k="follow_ups" />;
export const SegmentsPage         = () => <Page k="segments" />;
export const CommunicationsPage   = () => <Page k="communications" />;
