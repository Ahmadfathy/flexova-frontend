import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Truck, ChevronRight, ChevronLeft } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";

import { formatMoney, formatTime } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useWholesaleVisits } from "@/stores/wholesaleVisits";
import { useWholesaleVanSales } from "@/stores/wholesaleVanSales";
import { useWholesaleVanShifts } from "@/stores/wholesaleVanShifts";
import { useWholesaleSyncQueue } from "@/stores/wholesaleSyncQueue";
import { getReps, getWarehouses } from "@/lib/mock/wholesale";
import type { VanShiftStatus } from "@/types/wholesale";

const SHIFT_PILL: Record<VanShiftStatus, PillVariant> = {
  open: "active",
  closed: "approved",
  closed_with_variance: "pending",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function RepsBoardPage() {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const ChevronIcon = lang === "ar" ? ChevronLeft : ChevronRight;

  const visits = useWholesaleVisits((s) => s.visits);
  const sales = useWholesaleVanSales((s) => s.sales);
  const shifts = useWholesaleVanShifts((s) => s.shifts);
  const syncEntries = useWholesaleSyncQueue((s) => s.entries);

  const reps = useMemo(() => getReps(), []);
  const today = todayStr();

  const rows = reps.map((rep) => {
    const van = getWarehouses().find((w) => w.rep_id === rep.id);
    const repShifts = shifts.filter((s) => s.rep_id === rep.id).sort((a, b) => b.opened_at.localeCompare(a.opened_at));
    const shift = repShifts[0];

    const todayVisits = visits.filter((v) => v.rep_id === rep.id && v.date === today);
    const doneVisits = todayVisits.filter((v) => v.status !== "scheduled").length;

    const shiftSales = shift ? sales.filter((s) => s.shift_id === shift.id) : [];
    const salesTotal = round2(shiftSales.reduce((sum, s) => sum + s.totals.grand_total, 0));
    const collectionsTotal = shift?.collections ?? 0;

    const syncedForShift = shift ? syncEntries.filter((e) => e.shift_id === shift.id && e.status === "synced") : [];
    const lastSync = syncedForShift.reduce<string | null>((latest, e) => (!latest || e.created_at > latest ? e.created_at : latest), null);

    return { rep, van, shift, doneVisits, totalVisits: todayVisits.length, salesTotal, collectionsTotal, lastSync };
  });

  return (
    <div className="h-full overflow-auto p-4">
      <PageHeader title={t("reps.title")} count={rows.length} countLabel={t("reps.count_label")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map(({ rep, van, shift, doneVisits, totalVisits, salesTotal, collectionsTotal, lastSync }) => (
          <button
            key={rep.id}
            type="button"
            onClick={() => navigate(`/wholesale/reps/${rep.id}`)}
            className="text-start rounded border border-border bg-card p-4 space-y-3 hover:border-brand/40 hover:shadow-sm transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{lang === "ar" ? rep.name_ar : rep.name_en}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <Truck className="h-3 w-3 shrink-0" />
                  {van ? (lang === "ar" ? van.name_ar : van.name_en) : "—"}
                </p>
              </div>
              <ChevronIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>

            <StatusPill variant={shift ? SHIFT_PILL[shift.status] : "inactive"} label={t(`reps.shift_${shift?.status ?? "none"}`)} />

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-[11px] text-muted-foreground">{t("reps.col_visits")}</p>
                <p className="font-medium tabular-nums">{doneVisits}/{totalVisits}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("reps.col_sales")}</p>
                <p className="font-medium tabular-nums">{formatMoney(salesTotal, lang)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("reps.col_collections")}</p>
                <p className="font-medium tabular-nums">{formatMoney(collectionsTotal, lang)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("reps.col_last_sync")}</p>
                <p className="font-medium tabular-nums">{lastSync ? formatTime(lastSync) : "—"}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
