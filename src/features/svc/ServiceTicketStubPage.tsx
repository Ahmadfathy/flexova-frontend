import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/patterns/EmptyState";

/** Route target for appointment completion — Step 3 (FE_11) replaces this with the real Service Ticket (services + products, settle via POS tender). */
export default function ServiceTicketStubPage() {
  const { t } = useTranslation("svc");
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="h-full flex items-center justify-center p-4">
      <EmptyState
        icon={Receipt}
        title={t("ticket.stub_title")}
        description={t("ticket.stub_body", { id })}
        action={{ label: t("ticket.stub_back"), onClick: () => navigate("/svc/calendar") }}
      />
    </div>
  );
}
