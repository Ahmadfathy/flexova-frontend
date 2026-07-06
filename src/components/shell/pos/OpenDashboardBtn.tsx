import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/lib/permissions";

/**
 * Opens the back-office dashboard in a new tab — a manager who wants both
 * open. Distinct from ExitPosBtn, which leaves POS in the same tab.
 */
export function OpenDashboardBtn() {
  const { t } = useTranslation("pos");
  const can = useCan();

  if (!can("app.backoffice.access")) return null;

  return (
    <Button
      variant="icon"
      size="icon"
      asChild
      className="h-11 w-11 shrink-0"
    >
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("layout.open_dashboard")}
        title={t("layout.open_dashboard")}
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </Button>
  );
}
