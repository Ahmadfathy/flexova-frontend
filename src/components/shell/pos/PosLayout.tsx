import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LockKeyhole, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/stores/appearance";
import { usePosRegister } from "@/stores/posRegister";
import { usePosShift } from "@/stores/posShift";
import { PosTopBar } from "./PosTopBar";
import { PosCategoryRail } from "./PosCategoryRail";
import { TicketPanel } from "@/features/pos/TicketPanel";
import { OpenShiftDialog } from "@/features/pos/OpenShiftDialog";
import { ShiftActionsDialog } from "@/features/pos/ShiftActionsDialog";
import { ZReportView } from "@/features/pos/ZReportView";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";
import permissionsFixtures from "@/lib/mock/fixtures/permissions.fixtures.json";

const CURRENT_TERMINAL = posFixtures.terminals[0];
const BRANCH = permissionsFixtures.branches.find(b => b.id === CURRENT_TERMINAL.branch_id);
const QUEUE_COUNT = posFixtures.tickets.filter(t => t.sync_status === "queued").length;
const IS_SANDBOX = posFixtures._meta.eta.environment === "sandbox";

/** Grid-area placeholder — screens not yet built in this step still land here via <Outlet/>. */
export function PosGridPlaceholder() {
  const { t } = useTranslation("pos");
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <LayoutGrid className="h-8 w-8" />
      <p className="text-sm font-medium text-foreground">{t("layout.grid_placeholder_title")}</p>
      <p className="text-xs">{t("layout.grid_placeholder_body")}</p>
    </div>
  );
}

interface PosLayoutProps {
  /** "pos" (default) keeps the cashier rail+ticket body; "generic" gives sector
   * modules (e.g. F&B) a full-bleed body — they assemble their own chrome. */
  variant?: "pos" | "generic";
}

export function PosLayout({ variant = "pos" }: PosLayoutProps) {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const hasOpenTicket = usePosRegister(s => s.lines.length > 0) && variant === "pos";

  const shiftStatus = usePosShift(s => s.status);
  const shiftCashierAr = usePosShift(s => s.cashierAr);
  const shiftCashierEn = usePosShift(s => s.cashierEn);
  const lastClosedShift = usePosShift(s => s.lastClosedShift);
  const shiftOpen = shiftStatus === "open";

  const [openShiftDialogOpen, setOpenShiftDialogOpen] = useState(false);
  const [shiftActionsOpen, setShiftActionsOpen] = useState(false);

  const cashierName = shiftOpen
    ? (lang === "ar" ? shiftCashierAr : shiftCashierEn)
    : undefined;

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-background">
      <PosTopBar
        terminalName={lang === "ar" ? CURRENT_TERMINAL.name_ar : CURRENT_TERMINAL.name_en}
        branchName={BRANCH ? (lang === "ar" ? BRANCH.name_ar : BRANCH.name_en) : ""}
        shiftOpen={shiftOpen}
        cashierName={cashierName}
        onToggleShift={shiftOpen ? () => setShiftActionsOpen(true) : undefined}
        queueCount={QUEUE_COUNT}
        sandbox={IS_SANDBOX}
        hasOpenTicket={hasOpenTicket}
      />

      {shiftOpen ? (
        variant === "pos" ? (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            <PosCategoryRail />

            {/* ── Grid area — FE_09 cashier/close-shift screens mount here ─ */}
            <div className="flex-1 min-w-0 min-h-0 overflow-auto p-4 pb-20 lg:pb-4">
              <Outlet />
            </div>

            <TicketPanel />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            <Outlet />
          </div>
        )
      ) : lastClosedShift ? (
        <div className="flex-1 min-h-0 overflow-auto p-4 md:p-8">
          <ZReportView summary={lastClosedShift} onStartNewShift={() => setOpenShiftDialogOpen(true)} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div className="max-w-sm w-full flex flex-col items-center text-center gap-3 rounded-lg border border-border bg-card p-8">
            <LockKeyhole className="h-8 w-8 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">{t("layout.no_shift_title")}</p>
            <p className="text-sm text-muted-foreground">{t("layout.no_shift_body")}</p>
            <Button variant="solid" tone="primary" onClick={() => setOpenShiftDialogOpen(true)}>
              {t("shift.open")}
            </Button>
          </div>
        </div>
      )}

      <OpenShiftDialog open={openShiftDialogOpen} onOpenChange={setOpenShiftDialogOpen} />
      <ShiftActionsDialog open={shiftActionsOpen} onOpenChange={setShiftActionsOpen} />
    </div>
  );
}
