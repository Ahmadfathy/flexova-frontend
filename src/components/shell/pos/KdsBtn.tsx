import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosIconTooltip } from "./PosIconTooltip";

/** Navigates to the kitchen display screen (/fnb/kds — FE_10 §7). */
export function KdsBtn() {
  const { t } = useTranslation("fnb");
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname.startsWith("/fnb/kds");

  return (
    <PosIconTooltip label={t("kds.title")}>
      <Button
        variant={active ? "soft" : "icon"}
        tone={active ? "primary" : undefined}
        size="icon"
        className="h-11 w-11 shrink-0"
        onClick={() => navigate("/fnb/kds")}
        aria-label={t("kds.title")}
      >
        <ChefHat className="h-4 w-4" />
      </Button>
    </PosIconTooltip>
  );
}
