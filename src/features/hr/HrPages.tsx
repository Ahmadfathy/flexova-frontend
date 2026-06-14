import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";

function Page({ k }: { k: string }) {
  const { t } = useTranslation("hr");
  return (
    <>
      <PageHeader title={t(`${k}.title`)} />
      <EmptyState />
    </>
  );
}

export const HrDashboardPage = () => <Page k="dashboard" />;
export const EmployeesPage   = () => <Page k="employees" />;
export const AttendancePage  = () => <Page k="attendance" />;
export const AdvancesPage    = () => <Page k="advances" />;
export const PayrollPage     = () => <Page k="payroll" />;
export const CommissionsPage = () => <Page k="commissions" />;
