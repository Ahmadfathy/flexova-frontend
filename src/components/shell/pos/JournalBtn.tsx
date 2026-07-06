import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { BookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosIconTooltip } from "./PosIconTooltip";

/** Navigates to the terminal journal screen (/pos/journal — FE_09 §11). */
export function JournalBtn() {
  const { t } = useTranslation("pos");
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname.startsWith("/pos/journal");

  return (
    <PosIconTooltip label={t("layout.journal")}>
      <Button
        variant={active ? "soft" : "icon"}
        tone={active ? "primary" : undefined}
        size="icon"
        className="h-11 w-11 shrink-0"
        onClick={() => navigate("/pos/journal")}
        aria-label={t("layout.journal")}
      >
        <BookText className="h-4 w-4" />
      </Button>
    </PosIconTooltip>
  );
}
