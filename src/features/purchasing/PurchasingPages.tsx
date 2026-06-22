import { useTranslation } from "react-i18next";
import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";

import { SuppliersListPage }          from "./suppliers/SuppliersListPage";
import { SupplierCardPage }           from "./suppliers/SupplierCardPage";
import { PurchasesListPage }          from "./invoices/PurchasesListPage";
import { PurchaseInvoiceEditorPage }  from "./invoices/PurchaseInvoiceEditorPage";
import { PurchaseInvoiceViewPage }    from "./invoices/PurchaseInvoiceViewPage";
import { PurchaseReturnsPage }        from "./returns/PurchaseReturnsPage";
import { PurchaseVouchersPage }       from "./vouchers/PurchaseVouchersPage";
import { InboundEtaPage }             from "./inbound-eta/InboundEtaPage";

export { SuppliersListPage         as SuppliersPage           };
export { SupplierCardPage          as SupplierCard             };
export { PurchasesListPage         as PurchasesPage            };
export { PurchaseInvoiceEditorPage as PurchaseInvoiceEditor    };
export { PurchaseInvoiceViewPage   as PurchaseInvoiceView      };
export { PurchaseReturnsPage       as ReturnsPage              };
export { PurchaseVouchersPage      as VouchersPage             };
export { InboundEtaPage            as InboundEtaHubPage        };

function OrderStub() {
  const { t } = useTranslation("purchasing");
  return (
    <>
      <PageHeader title={t("orders.title")} />
      <PageSection><EmptyState /></PageSection>
    </>
  );
}

export const OrdersPage = OrderStub;
