import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/lib/permissions";

/**
 * Opens the back-office dashboard in a new tab — a manager who wants both
 * open. Distinct from ExitPosBtn, which leaves POS in the same tab. Styled
 * as a visible green pill (not a tooltip-only icon), placed before Journal.
 */
export function OpenDashboardBtn() {
  const { t } = useTranslation("pos");
  const can = useCan();

  if (!can("app.backoffice.access")) return null;

  return (
    <Button
      variant="solid"
      tone="success"
      size="sm"
      asChild
      className="h-11 rounded-full gap-1.5 px-3 shrink-0"
    >
      <a href="/" target="_blank" rel="noopener noreferrer">
        <LayoutDashboard className="h-4 w-4" />
        <span className="whitespace-nowrap">{t("layout.open_dashboard")}</span>
      </a>
    </Button>
  );
}
