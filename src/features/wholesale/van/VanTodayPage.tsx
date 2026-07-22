import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lock, LockKeyhole, CalendarX2, MapPin } from "lucide-react";

import { StatCard } from "@/components/patterns/StatCard";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { Skeleton } from "@/components/patterns/Skeletons";
import { VisitCard } from "@/components/van/VisitCard";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";

import { mockFetch } from "@/lib/mock/client";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useVanSession } from "@/stores/vanSession";
import { useWholesaleVisits } from "@/stores/wholesaleVisits";
import { useWholesaleCustomers } from "@/stores/wholesaleCustomers";
import { useWholesaleCreditReservations } from "@/stores/wholesaleCreditReservations";
import { useWholesaleOrders } from "@/stores/wholesaleOrders";
import { useWholesaleSyncQueue } from "@/stores/wholesaleSyncQueue";
import {
  getReps, getRoutes, getVanStock, getCollections, getNoOrderReasons,
} from "@/lib/mock/wholesale";
import { formatDate } from "@/lib/format";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function VisitCardSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}

export function VanTodayPage() {
  const { t } = useTranslation("van");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const session = useVanSession();
  const visits = useWholesaleVisits((s) => s.visits);
  const updateVisit = useWholesaleVisits((s) => s.updateVisit);
  const addVisits = useWholesaleVisits((s) => s.addVisits);
  const customers = useWholesaleCustomers((s) => s.customers);
  const reservations = useWholesaleCreditReservations((s) => s.reservations);
  const orders = useWholesaleOrders((s) => s.orders);
  const enqueueSync = useWholesaleSyncQueue((s) => s.enqueue);
  const noOrderReasons = useMemo(() => getNoOrderReasons(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forcedEmpty, setForcedEmpty] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForcedEmpty(false);
    try {
      const result = await mockFetch(async () => "ok" as const, "empty" as const);
      if (result === "empty") setForcedEmpty(true);
    } catch (err) {
      // Offline never blocks this screen (FE_13 §2.4) — only the SyncIndicator
      // in the shared top bar reflects connection state; data still loads from
      // the local bundle/stores either way.
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg !== "mock_offline") setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!can("van.shift.open")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("today.permission_required")}</p>
      </div>
    );
  }

  if (!session.open) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-sm w-full flex flex-col items-center text-center gap-3 rounded-lg border border-border bg-card p-8">
          <LockKeyhole className="h-8 w-8 text-muted-foreground" />
          <p className="text-base font-semibold text-foreground">{t("today.no_shift_title")}</p>
          <p className="text-sm text-muted-foreground">{t("today.no_shift_body")}</p>
          <Button variant="solid" tone="primary" onClick={() => navigate("/van/shift/open")}>
            {t("today.no_shift_cta")}
          </Button>
        </div>
      </div>
    );
  }

  const rep = getReps().find((r) => r.id === session.repId);
  const route = getRoutes().find((r) => r.id === session.routeId);
  const today = todayStr();

  const todayVisits = visits
    .filter((v) => v.route_id === session.routeId && v.date === today)
    .sort((a, b) => a.sequence - b.sequence);

  const doneCount = todayVisits.filter((v) => v.status !== "scheduled").length;

  const todaySales = orders
    .filter((o) => o.rep_id === session.repId && o.date === today)
    .reduce((s, o) => s + o.totals.grand_total, 0);

  const todayCollections = getCollections()
    .filter((c) => c.rep_id === session.repId && c.date === today)
    .reduce((s, c) => s + c.amount, 0);

  const vanStockValue = getVanStock()
    .filter((s) => s.warehouse_id === session.vanWarehouseId)
    .reduce((sum, s) => sum + s.qty_base * s.avg_cost, 0);

  const offPlanCandidates = customers.filter(
    (c) => !todayVisits.some((v) => v.customer_id === c.id),
  );

  function lastVisitDateFor(customerId: string): string | null {
    const prior = visits
      .filter((v) => v.customer_id === customerId && v.date < today && v.status !== "scheduled")
      .sort((a, b) => b.date.localeCompare(a.date));
    return prior[0]?.date ?? null;
  }

  function handleStart(visitId: string) {
    navigate(`/van/visit/${visitId}`);
  }

  function handleDefer(visitId: string, reason: string) {
    updateVisit(visitId, { status: "deferred", no_order_reason: reason });
    enqueueSync({ op: "visit_update", shift_id: session.vanWarehouseId ?? "", client_uuid: crypto.randomUUID() });
    toast.success(t("today.defer_success"));
  }

  function addOffPlanVisit(customerId: string) {
    const maxSeq = todayVisits.reduce((m, v) => Math.max(m, v.sequence), 0);
    addVisits([{
      id: crypto.randomUUID(),
      date: today,
      route_id: session.routeId ?? "",
      rep_id: session.repId ?? "",
      customer_id: customerId,
      sequence: maxSeq + 1,
      status: "scheduled",
      doc_id: null,
      note: "",
    }]);
    setPickerOpen(false);
    toast.success(t("today.ad_hoc_visit_added"));
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            {route ? (lang === "ar" ? route.name_ar : route.name_en) : "—"}
            <span className="text-muted-foreground font-normal">· {formatDate(today)}</span>
          </div>
          <span className="text-sm text-muted-foreground">{rep ? (lang === "ar" ? rep.name_ar : rep.name_en) : "—"}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 pb-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label={t("today.stat_visits")} value={`${doneCount}/${todayVisits.length}`} tone="brand" />
          <StatCard label={t("today.stat_sales")} value={formatMoney(todaySales, lang)} tone="success" />
          <StatCard label={t("today.stat_collections")} value={formatMoney(todayCollections, lang)} tone="success" />
          <StatCard label={t("today.stat_van_stock")} value={formatMoney(vanStockValue, lang)} tone="plain" />
        </div>

        {loading ? (
          <VisitCardSkeleton />
        ) : error ? (
          <ErrorState title={t("today.error_title")} description={t("today.error_body")} onRetry={load} />
        ) : forcedEmpty || todayVisits.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title={t("today.empty_title")}
            action={{ label: t("today.empty_cta"), onClick: () => setPickerOpen(true) }}
          />
        ) : (
          <div className="space-y-2.5">
            {todayVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                customer={customers.find((c) => c.id === visit.customer_id)}
                reservations={reservations}
                lastVisitDate={lastVisitDateFor(visit.customer_id)}
                noOrderReasons={noOrderReasons}
                lang={lang}
                onStart={() => handleStart(visit.id)}
                onDefer={(reason) => handleDefer(visit.id, reason)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-border bg-card">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex-1">{t("today.off_plan_customer")}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start" side="top">
            <Command>
              <CommandInput placeholder={t("today.search_customer_placeholder")} />
              <CommandList>
                <CommandEmpty>{t("today.no_customers_found")}</CommandEmpty>
                <CommandGroup>
                  {offPlanCandidates.map((c) => (
                    <CommandItem key={c.id} value={`${c.name_ar} ${c.name_en}`} onSelect={() => addOffPlanVisit(c.id)}>
                      {lang === "ar" ? c.name_ar : c.name_en}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button variant="solid" tone="primary" className="flex-1" onClick={() => navigate("/van/shift/close")}>
          {t("today.close_shift")}
        </Button>
      </div>
    </div>
  );
}
