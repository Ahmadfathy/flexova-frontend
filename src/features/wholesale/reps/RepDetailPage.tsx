import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Truck, ShoppingCart, HandCoins, MapPin, ShieldAlert,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";

import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useAuthStore } from "@/stores/auth";
import { useCan } from "@/lib/permissions";
import { useWholesaleVisits } from "@/stores/wholesaleVisits";
import { useWholesaleCustomers } from "@/stores/wholesaleCustomers";
import { useWholesaleVanSales } from "@/stores/wholesaleVanSales";
import { useWholesaleCollections } from "@/stores/wholesaleCollections";
import { useWholesaleVanShifts } from "@/stores/wholesaleVanShifts";
import { getReps, getWarehouses, getItems } from "@/lib/mock/wholesale";
import type { VanShiftStatus } from "@/types/wholesale";

const SHIFT_PILL: Record<VanShiftStatus, PillVariant> = {
  open: "active",
  closed: "approved",
  closed_with_variance: "pending",
};

interface TimelineEntry {
  at: string;
  kind: "visit" | "sale" | "collection";
  label: string;
  amount?: number;
}

export function RepDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const can = useCan();
  const currentUserId = useAuthStore((s) => s.user?.id) ?? "u_dev";

  const visits = useWholesaleVisits((s) => s.visits);
  const customers = useWholesaleCustomers((s) => s.customers);
  const sales = useWholesaleVanSales((s) => s.sales);
  const collections = useWholesaleCollections((s) => s.collections);
  const shifts = useWholesaleVanShifts((s) => s.shifts);
  const approveVariance = useWholesaleVanShifts((s) => s.approveVariance);

  const rep = useMemo(() => getReps().find((r) => r.id === id), [id]);
  const van = useMemo(() => getWarehouses().find((w) => w.rep_id === id), [id]);
  const items = useMemo(() => getItems(), []);

  const repShifts = useMemo(
    () => shifts.filter((s) => s.rep_id === id).sort((a, b) => b.opened_at.localeCompare(a.opened_at)),
    [shifts, id],
  );
  const shift = repShifts[0];

  const shiftVisits = useMemo(() => visits.filter((v) => v.rep_id === id), [visits, id]);
  const shiftSales = useMemo(() => sales.filter((s) => s.shift_id === shift?.id), [sales, shift]);
  const shiftCollections = useMemo(() => collections.filter((c) => c.shift_id === shift?.id), [collections, shift]);

  const timeline: TimelineEntry[] = useMemo(() => {
    const customerName = (cid: string) => {
      const c = customers.find((x) => x.id === cid);
      return c ? (lang === "ar" ? c.name_ar : c.name_en) : cid;
    };
    const entries: TimelineEntry[] = [
      ...shiftVisits
        .filter((v) => v.status !== "scheduled")
        .map((v) => ({ at: v.date, kind: "visit" as const, label: `${t(`visit_status.${v.status}`, { ns: "van", defaultValue: v.status })} · ${customerName(v.customer_id)}` })),
      ...shiftSales.map((s) => ({ at: s.date, kind: "sale" as const, label: `${s.number} · ${customerName(s.customer_id)}`, amount: s.totals.grand_total })),
      ...shiftCollections.map((c) => ({ at: c.date, kind: "collection" as const, label: `${c.number} · ${customerName(c.customer_id)}`, amount: c.amount })),
    ];
    return entries.sort((a, b) => b.at.localeCompare(a.at));
  }, [shiftVisits, shiftSales, shiftCollections, customers, lang, t]);

  const doneVisits = shiftVisits.filter((v) => v.status !== "scheduled").length;

  const hasPendingApproval = shift?.settlement_status === "pending_approval";
  const isSameUser = shift?.settled_by === currentUserId;
  const canApprove = can("van.variance.approve") && hasPendingApproval && !isSameUser;

  function handleApprove() {
    if (!shift) return;
    approveVariance(shift.id, currentUserId);
    toast.success(t("rep_detail.approve_success"));
  }

  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  if (!rep) {
    return (
      <div className="h-full overflow-auto p-4">
        <EmptyState icon={Truck} title={t("rep_detail.not_found")} description="" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/wholesale/reps")}>
          <BackIcon className="h-4 w-4 me-1" />
          {t("rep_detail.back")}
        </Button>

        <PageHeader
          title={lang === "ar" ? rep.name_ar : rep.name_en}
          subtitle={van ? (lang === "ar" ? van.name_ar : van.name_en) : undefined}
        />

        <PageSection title={t("rep_detail.summary_title")}>
          {!shift ? (
            <p className="text-sm text-muted-foreground">{t("rep_detail.no_shift")}</p>
          ) : (
            <div className="space-y-3">
              <StatusPill variant={SHIFT_PILL[shift.status]} label={t(`reps.shift_${shift.status}`)} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground">{t("reps.col_visits")}</p>
                  <p className="font-medium tabular-nums">{doneVisits}/{shiftVisits.length}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{t("reps.col_sales")}</p>
                  <p className="font-medium tabular-nums">
                    {formatMoney(round2(shiftSales.reduce((s, x) => s + x.totals.grand_total, 0)), lang)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{t("reps.col_collections")}</p>
                  <p className="font-medium tabular-nums">{formatMoney(shift.collections, lang)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{t("rep_detail.cash_variance")}</p>
                  <p className={`font-medium tabular-nums ${Math.abs(shift.cash_variance ?? 0) > 0.005 ? "text-warning-text" : "text-success-text"}`}>
                    {formatMoney(shift.cash_variance ?? 0, lang)}
                  </p>
                </div>
              </div>

              {(shift.goods_variance?.length ?? 0) > 0 && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground">{t("rep_detail.goods_variance_title")}</p>
                  {shift.goods_variance!.map((g, i) => {
                    const item = items.find((it) => it.id === g.item_id);
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{item ? (lang === "ar" ? item.name_ar : item.name_en) : g.item_id}</span>
                        <span className="tabular-nums text-warning-text">{g.variance_base > 0 ? "+" : ""}{g.variance_base} · {g.reason}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {hasPendingApproval && (
                <div className="pt-2 border-t border-border space-y-2">
                  {isSameUser ? (
                    <Alert variant="warning" title={t("rep_detail.sod_blocked_title")}>
                      {t("rep_detail.sod_blocked_body")}
                    </Alert>
                  ) : (
                    <Alert variant="info" title={t("rep_detail.approval_needed_title")}>
                      {t("rep_detail.approval_needed_body")}
                    </Alert>
                  )}
                  <Button disabled={!canApprove} onClick={handleApprove}>
                    <ShieldAlert className="h-4 w-4 me-1.5" />
                    {t("rep_detail.approve_action")}
                  </Button>
                </div>
              )}

              {shift.settlement_status === "approved" && (
                <p className="text-xs text-success-text pt-2 border-t border-border">{t("rep_detail.already_approved")}</p>
              )}
            </div>
          )}
        </PageSection>

        <PageSection title={t("rep_detail.timeline_title")}>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("rep_detail.no_activity")}</p>
          ) : (
            <div className="divide-y divide-border">
              {timeline.map((entry, i) => {
                const Icon = entry.kind === "visit" ? MapPin : entry.kind === "sale" ? ShoppingCart : HandCoins;
                return (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1 min-w-0 truncate">{entry.label}</span>
                    {entry.amount != null && <span className="text-sm font-medium tabular-nums">{formatMoney(entry.amount, lang)}</span>}
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(entry.at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </PageSection>
      </div>
    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
