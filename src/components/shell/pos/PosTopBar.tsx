import { useTranslation } from "react-i18next";
import { Languages, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/stores/appearance";
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

      {/* ── End: fullscreen · language · exit ───────────────────── */}
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
