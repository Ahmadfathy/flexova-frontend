import { useTranslation } from "react-i18next";
import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";

import { SuppliersListPage } from "./suppliers/SuppliersListPage";
import { SupplierCardPage }  from "./suppliers/SupplierCardPage";

export { SuppliersListPage as SuppliersPage };
export { SupplierCardPage  as SupplierCard  };

function Page({ k }: { k: string }) {
  const { t } = useTranslation("purchasing");
  return (
    <>
      <PageHeader title={t(`${k}.title`)} />
      <PageSection><EmptyState /></PageSection>
    </>
  );
}

export const PurchasesPage  = () => <Page k="invoices" />;
export const OrdersPage     = () => <Page k="orders" />;
export const ReturnsPage    = () => <Page k="returns" />;
export const VouchersPage   = () => <Page k="vouchers" />;
export const InboundEtaPage = () => <Page k="inbound_eta" />;
