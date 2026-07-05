import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LockKeyhole, LayoutGrid, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { PosTopBar } from "./PosTopBar";
import { PosCategoryRail } from "./PosCategoryRail";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";
import permissionsFixtures from "@/lib/mock/fixtures/permissions.fixtures.json";

interface PosItem {
  item_id: string;
  name_ar: string;
  name_en: string;
}

const CURRENT_TERMINAL = posFixtures.terminals[0];
const BRANCH = permissionsFixtures.branches.find(b => b.id === CURRENT_TERMINAL.branch_id);
const OPEN_SHIFT = posFixtures.shifts.find(
  s => s.terminal_id === CURRENT_TERMINAL.id && s.status === "open"
);
const QUEUE_COUNT = posFixtures.tickets.filter(t => t.sync_status === "queued").length;
const DEMO_TICKET = posFixtures.tickets.find(t => t.status === "parked");
const POS_ITEMS = posFixtures.pos_items as PosItem[];
const IS_SANDBOX = posFixtures._meta.eta.environment === "sandbox";

function itemName(itemId: string, lang: "ar" | "en") {
  const item = POS_ITEMS.find(i => i.item_id === itemId);
  return item ? (lang === "ar" ? item.name_ar : item.name_en) : itemId;
}

/** Grid-area placeholder — the FE_09 cashier screen mounts here via <Outlet/>. */
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

export function PosLayout() {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const [shiftOpen, setShiftOpen] = useState(!!OPEN_SHIFT);
  const [ticketExpanded, setTicketExpanded] = useState(false);

  const cashierName = OPEN_SHIFT
    ? (lang === "ar" ? OPEN_SHIFT.cashier_ar : OPEN_SHIFT.cashier_en)
    : undefined;

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-background">
      <PosTopBar
        terminalName={lang === "ar" ? CURRENT_TERMINAL.name_ar : CURRENT_TERMINAL.name_en}
        branchName={BRANCH ? (lang === "ar" ? BRANCH.name_ar : BRANCH.name_en) : ""}
        shiftOpen={shiftOpen}
        cashierName={cashierName}
        onToggleShift={() => setShiftOpen(o => !o)}
        queueCount={QUEUE_COUNT}
        sandbox={IS_SANDBOX}
        hasOpenTicket={!!DEMO_TICKET}
      />

      {shiftOpen ? (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          <PosCategoryRail />

          {/* ── Grid area — FE_09 cashier screen mounts here ────── */}
          <div className="flex-1 min-w-0 min-h-0 overflow-auto p-4 pb-20 lg:pb-4">
            <Outlet />
          </div>

          {/* ── Ticket panel — placeholder until FE_09 TicketPanel ─
              Desktop: docked column, always expanded.
              Small screens: bottom sheet — peek (total + Pay) or expanded (lines). */}
          <aside
            className={cn(
              "flex flex-col shrink-0 border-border bg-card z-20",
              "fixed inset-x-0 bottom-0 border-t rounded-t-xl shadow-lg overflow-hidden",
              "transition-[max-height] duration-200 ease-brand",
              ticketExpanded ? "max-h-[70vh]" : "max-h-16",
              "lg:static lg:inset-auto lg:rounded-none lg:shadow-none lg:border-t-0 lg:border-s",
              "lg:w-[380px] lg:max-h-none lg:overflow-visible"
            )}
          >
            {/* Peek bar — small screens only, tap to expand/collapse */}
            <button
              type="button"
              onClick={() => setTicketExpanded(v => !v)}
              className="lg:hidden flex items-center justify-between h-16 px-4 shrink-0 w-full"
            >
              <span className="text-sm font-semibold text-foreground">{t("layout.ticket_placeholder_title")}</span>
              <span className="flex items-center gap-3">
                {DEMO_TICKET && (
                  <span className="tabular-nums font-bold text-foreground">
                    {DEMO_TICKET.totals.grand_total.toFixed(2)}
                  </span>
                )}
                <ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform", ticketExpanded && "rotate-180")} />
              </span>
            </button>

            {/* Header — desktop only (mobile shows the title in the peek bar) */}
            <div className="hidden lg:block px-4 py-3 border-b border-border shrink-0">
              <p className="text-sm font-semibold text-foreground">{t("layout.ticket_placeholder_title")}</p>
            </div>

            <div className="flex-1 min-h-0 overflow-auto px-4 space-y-2 lg:py-4">
              {DEMO_TICKET?.lines.map((line, i) => (
                <div key={i} className="flex items-center justify-between text-sm gap-2">
                  <span className="truncate text-foreground">
                    {itemName(line.item_id, lang)} × {"qty" in line ? line.qty : line.weight_kg}
                  </span>
                  <span className="tabular-nums text-muted-foreground shrink-0">{line.line_total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {DEMO_TICKET && (
              <div className="hidden lg:flex px-4 py-2 border-t border-border shrink-0 items-center justify-between text-sm font-bold">
                <span>{t("layout.grand_total")}</span>
                <span className="tabular-nums">{DEMO_TICKET.totals.grand_total.toFixed(2)}</span>
              </div>
            )}

            <div className="p-3 border-t border-border shrink-0 space-y-2">
              <Button variant="solid" tone="primary" size="lg" className="w-full h-11" disabled>
                {t("pay")}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-11" disabled>
                  {t("park")}
                </Button>
                <Button variant="outline" size="sm" className="h-11" disabled>
                  {t("customer")}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div className="max-w-sm w-full flex flex-col items-center text-center gap-3 rounded-lg border border-border bg-card p-8">
            <LockKeyhole className="h-8 w-8 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">{t("layout.no_shift_title")}</p>
            <p className="text-sm text-muted-foreground">{t("layout.no_shift_body")}</p>
            <Button variant="solid" tone="primary" onClick={() => setShiftOpen(true)}>
              {t("layout.open_shift_cta")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
