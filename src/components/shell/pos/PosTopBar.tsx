import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { Languages, FlaskConical, BookText, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { ShiftIndicator } from "./ShiftIndicator";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { ExitPosBtn } from "./ExitPosBtn";
import { FullscreenBtn } from "./FullscreenBtn";

interface PosTopBarProps {
  terminalName: string;
  branchName: string;
  shiftOpen: boolean;
  cashierName?: string;
  onToggleShift?: () => void;
  queueCount: number;
  sandbox: boolean;
  hasOpenTicket: boolean;
}

export function PosTopBar({
  terminalName, branchName, shiftOpen, cashierName, onToggleShift, queueCount, sandbox, hasOpenTicket,
}: PosTopBarProps) {
  const { t } = useTranslation("pos");
  const { lang, setLang } = useAppearance();
  const navigate = useNavigate();
  const location = useLocation();
  const can = useCan();

  return (
    <header className="flex items-center gap-2 h-[52px] px-3 border-b border-border bg-card shrink-0 overflow-x-auto">
      {/* ── Start: terminal / branch ─────────────────────────── */}
      <div className="flex flex-col leading-tight shrink-0 min-w-0 me-1">
        <span className="text-sm font-semibold text-foreground truncate">{terminalName}</span>
        <span className="text-[11px] text-muted-foreground truncate">{branchName}</span>
      </div>

      <ShiftIndicator open={shiftOpen} cashierName={cashierName} onClick={onToggleShift} />
      <ConnectionIndicator queueCount={queueCount} />

      {sandbox && (
        <span className="inline-flex items-center gap-1 rounded px-2 h-11 text-xs font-medium bg-warning-tint text-warning-text shrink-0">
          <FlaskConical className="h-3.5 w-3.5" />
          <span className="hidden sm:inline whitespace-nowrap">{t("layout.sandbox")}</span>
        </span>
      )}

      {/* ── Spacer ────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0" />

      {/* ── End: journal · settings · fullscreen · language · exit ── */}
      {shiftOpen && can("pos.journal.view") && (
        <Button
          variant={location.pathname === "/pos/journal" ? "soft" : "icon"}
          tone={location.pathname === "/pos/journal" ? "primary" : undefined}
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={() => navigate("/pos/journal")}
          aria-label={t("journal.title")}
          title={t("journal.title")}
        >
          <BookText className="h-4 w-4" />
        </Button>
      )}

      {shiftOpen && can("pos.terminal.settings") && (
        <Button
          variant={location.pathname === "/pos/settings" ? "soft" : "icon"}
          tone={location.pathname === "/pos/settings" ? "primary" : undefined}
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={() => navigate("/pos/settings")}
          aria-label={t("settings.title")}
          title={t("settings.title")}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      )}

      <FullscreenBtn />

      <Button
        variant="icon"
        size="icon"
        className="h-11 w-11 shrink-0"
        onClick={() => setLang(lang === "ar" ? "en" : "ar")}
        aria-label={t("layout.switch_language")}
        title={t("layout.switch_language")}
      >
        <Languages className="h-4 w-4" />
      </Button>

      <ExitPosBtn hasOpenTicket={hasOpenTicket} />
    </header>
  );
}
