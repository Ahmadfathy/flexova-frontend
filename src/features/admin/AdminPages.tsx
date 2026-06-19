import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";

function Page({ k }: { k: string }) {
  const { t } = useTranslation("admin");
  return (
    <>
      <PageHeader title={t(`${k}.title`)} />
      <PageSection><EmptyState /></PageSection>
    </>
  );
}

export const UsersPage    = () => <Page k="users" />;
export const RolesPage    = () => <Page k="roles" />;
export const BranchesPage = () => <Page k="branches" />;
export const SecurityPage = () => <Page k="security" />;
export const AuditPage    = () => <Page k="audit" />;
