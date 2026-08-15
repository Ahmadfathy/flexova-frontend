import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Languages, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { PosBrandLogo } from "./PosBrandLogo";
import { PosBrandClock } from "./PosBrandClock";
import { ShiftIndicator } from "./ShiftIndicator";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { OpenDashboardBtn } from "./OpenDashboardBtn";
import { JournalBtn } from "./JournalBtn";
import { TerminalBtn } from "./TerminalBtn";
import { KdsBtn } from "./KdsBtn";
import { PosIconTooltip } from "./PosIconTooltip";
import { FullscreenBtn } from "./FullscreenBtn";
import { ExitPosBtn } from "./ExitPosBtn";

interface PosTopBarProps {
  terminalName: string;
  branchName: string;
  shiftOpen: boolean;
  cashierName?: string;
  onToggleShift?: () => void;
  queueCount: number;
  sandbox: boolean;
  hasOpenTicket: boolean;
  /** Additive slot (FE_13 §2.1) — unused by every other sector; renders
   * right before the Dashboard pill when a caller supplies one. */
  syncIndicator?: ReactNode;
}

export function PosTopBar({
  terminalName, branchName, shiftOpen, cashierName, onToggleShift, queueCount, sandbox, hasOpenTicket,
  syncIndicator,
}: PosTopBarProps) {
  const { t } = useTranslation("pos");
  const { lang, setLang } = useAppearance();
  const can = useCan();
  const isFnb = useLocation().pathname.startsWith("/fnb");

  return (
    <header className="flex items-stretch h-[52px] border-b border-border bg-card shrink-0 overflow-x-auto">
      {/* ── Logo column — column-aligned to the category rail below (~64px, lg+) ── */}
      <div className="hidden lg:flex w-20 shrink-0 items-center justify-center border-e border-border">
        <PosBrandLogo />
      </div>

      <div className="flex flex-1 items-center gap-2 px-3 min-w-0">
        {/* Compact logo — shown inline only below the rail breakpoint */}
        <span className="lg:hidden shrink-0">
          <PosBrandLogo />
        </span>

        <PosBrandClock />

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

        {/* ── End (order matters): syncIndicator · Dashboard pill · journal · terminal · language · fullscreen · exit ── */}
        {syncIndicator}
        <OpenDashboardBtn />

        {shiftOpen && isFnb && can("fnb.kds.view") && <KdsBtn />}
        {shiftOpen && can("pos.journal.view") && <JournalBtn />}
        {shiftOpen && can("pos.terminal.settings") && <TerminalBtn />}

        <PosIconTooltip label={t("layout.language")}>
          <Button
            variant="icon"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            aria-label={t("layout.switch_language")}
          >
            <Languages className="h-4 w-4" />
          </Button>
        </PosIconTooltip>

        <FullscreenBtn />

        <ExitPosBtn hasOpenTicket={hasOpenTicket} />
      </div>
    </header>
  );
}
