import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";

import { useEtaConnection } from "@/hooks/useEtaConnection";

/**
 * Global "not connected" warning — shown on the primary issuing surfaces
 * (invoice editor, invoices list) so users are warned before they even
 * start, not just at the point of submission. Gated by the "banner"
 * connect_entrypoints flag (ETA-1 §1.3).
 */
export function EtaConnectBanner() {
  const { t } = useTranslation("eta");
  const navigate = useNavigate();
  const { status, flags } = useEtaConnection();

  const entrypoints = flags?.connect_entrypoints ?? [];
  const shouldShow = (status === "disconnected" || status === "error")
    && entrypoints.includes("banner");

  if (!shouldShow) return null;

  return (
    <Alert variant="warning" title={t("banner.title")}>
      <span className="inline-flex items-center gap-3 flex-wrap">
        {t("banner.body")}
        <Button size="sm" variant="outline" onClick={() => navigate("/sales/settings/eta")}>
          <Link2 className="size-3.5 me-1.5" />
          {t("connection.cta_connect")}
        </Button>
      </span>
    </Alert>
  );
}
