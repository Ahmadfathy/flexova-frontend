import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosIconTooltip } from "./PosIconTooltip";

/** Navigates to the terminal settings screen (/pos/settings — FE_09 §12). */
export function TerminalBtn() {
  const { t } = useTranslation("pos");
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname.startsWith("/pos/settings");

  return (
    <PosIconTooltip label={t("layout.terminal")}>
      <Button
        variant={active ? "soft" : "icon"}
        tone={active ? "primary" : undefined}
        size="icon"
        className="h-11 w-11 shrink-0"
        onClick={() => navigate("/pos/settings")}
        aria-label={t("layout.terminal")}
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </PosIconTooltip>
  );
}
