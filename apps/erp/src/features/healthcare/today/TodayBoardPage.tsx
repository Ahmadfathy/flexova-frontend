import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CalendarClock, Clock, CheckCircle2, Wallet, Plus, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/patterns/PageHeader";
import { KpiCard } from "@/components/patterns/KpiCard";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { KpiSkeleton, TableSkeleton } from "@/components/patterns/Skeletons";
import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useHealthcareBoard } from "@/stores/healthcareBoard";
import { useHealthcareAudit } from "@/stores/healthcareAudit";
import { useHealthcareClinical } from "@/stores/healthcareClinical";
import { useHealthcarePatients } from "@/stores/healthcarePatients";
import { useMockState } from "../useMockState";
import { getProviders, patientName, providerName } from "@/lib/mock/healthcare";
import { CURRENT_PROVIDER_ID } from "@/features/healthcare/currentUser";
import type { TodayBoardRow, BoardStatus } from "@/features/healthcare/types";
import { QuickBookDialog } from "./QuickBookDialog";

const STATUS_VARIANT: Record<BoardStatus, PillVariant> = {
  booked: "pending",
  "checked-in": "in-progress",
  "in-visit": "active",
  completed: "approved",
  "no-show": "rejected",
  cancelled: "inactive",
};

export function TodayBoardPage() {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();

  const rowsMap = useHealthcareBoard((s) => s.rows);
  const checkIn = useHealthcareBoard((s) => s.checkIn);
  const collect = useHealthcareBoard((s) => s.collect);
  const applyOfflineDemoRow = useHealthcareBoard((s) => s.applyOfflineDemoRow);
  const logAccess = useHealthcareAudit((s) => s.logAccess);
  // Live, not the static fixture — a patient booked via quick-add/veterinary
  // add (Prompt 3) must resolve here too, not just fixture-seeded ones.
  const patients = useHealthcarePatients((s) => s.patients);

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  // Fixture demo row (§_states_demo.offline_row_example) — surfaces one row stuck
  // mid-sync so the "syncing" badge is visible without requiring a live action.
  useEffect(() => {
    if (isOffline) applyOfflineDemoRow();
  }, [isOffline, applyOfflineDemoRow]);

  // Default-narrowed scope (spec §11/§12): without view_all, a provider only
  // ever sees their own appointments — locked, not just defaulted, since the
  // picker itself would otherwise be the leak.
  const canViewAll = can("healthcare.patients.view_all");
  const [providerFilter, setProviderFilter] = useState(canViewAll ? "all" : CURRENT_PROVIDER_ID);
  useEffect(() => {
    if (!canViewAll) setProviderFilter(CURRENT_PROVIDER_ID);
  }, [canViewAll]);
  const [bookOpen, setBookOpen] = useState(false);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  const allRows = forcedEmpty
    ? []
    : Object.values(rowsMap)
        .filter((r) => canViewAll || r.provider_id === CURRENT_PROVIDER_ID)
        .sort((a, b) => a.time.localeCompare(b.time));

  const filtered = useMemo(
    () => (providerFilter === "all" ? allRows : allRows.filter((r) => r.provider_id === providerFilter)),
    [allRows, providerFilter]
  );

  const noResults = forcedNoResults || (allRows.length > 0 && filtered.length === 0);

  const providers = useMemo(() => getProviders().filter((p) => p.role === "doctor"), []);

  const kpis = useMemo(() => {
    const appointments = allRows.length;
    const waiting = allRows.filter((r) => r.status === "checked-in").length;
    const completed = allRows.filter((r) => r.status === "completed").length;
    const dueToday = allRows
      .filter((r) => r.status === "completed" && !r.collected)
      .reduce((sum, r) => sum + (r.patient_portion ?? 0), 0);
    return { appointments, waiting, completed, dueToday };
  }, [allRows]);

  function clearFilters() {
    setProviderFilter("all");
  }

  function handleStartVisit(row: TodayBoardRow) {
    // Golden rule (spec §0): clinical PHI is access-logged on READ, not only on write.
    // Looked up live (not the static fixture) so re-opening an already-started
    // local encounter lands back on the same record instead of creating a new one.
    const existing = Object.values(useHealthcareClinical.getState().encounters)
      .find((e) => e.appointment_id === row.appointment_id);
    const encounterId = existing?.id ?? row.appointment_id;
    logAccess({ actor: row.provider_id, patient_id: row.patient_id, surface: "encounter", action: "read" });
    navigate(`/healthcare/encounter/${encounterId}`);
  }

  function handleCollect(row: TodayBoardRow) {
    collect(row.appointment_id);
    const { encounters, invoices } = useHealthcareClinical.getState();
    const invoiceId = row.invoice_id
      ?? Object.values(encounters).find((e) => e.patient_id === row.patient_id && e.status === "completed")?.invoice_id
      ?? undefined;
    const invoice = invoiceId ? invoices[invoiceId] : undefined;
    const route = invoice?.eta_route === "b2b" ? t("today.eta_b2b") : t("today.eta_b2c");
    toast.success(t("today.collect_success", { amount: formatMoney(row.patient_portion ?? 0, lang), route }));
  }

  if (!can("healthcare.today.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("today.permission_required")}</p>
      </div>
    );
  }

  function renderAction(row: TodayBoardRow) {
    if (row.status === "booked") {
      return (
        <Button size="sm" variant="outline" onClick={() => checkIn(row.appointment_id)}>
          {t("today.action_checkin")}
        </Button>
      );
    }
    if (row.status === "checked-in") {
      // PHI gate (spec §3.5) — hidden outright for roles without clinical.view, not just disabled.
      if (!can("healthcare.clinical.view")) return <span className="text-muted-foreground text-xs">—</span>;
      return (
        <Button size="sm" onClick={() => handleStartVisit(row)}>
          {t("today.action_start_visit")}
        </Button>
      );
    }
    if (row.status === "completed") {
      if (!row.collected) {
        return (
          <Button size="sm" variant="outline" onClick={() => handleCollect(row)}>
            {t("today.action_collect")}
          </Button>
        );
      }
      return <StatusPill variant="approved" label={t("today.action_done")} />;
    }
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const columns: Column<TodayBoardRow>[] = [
    {
      key: "time", header: t("today.col_time"), numeric: true,
      cell: (row) => <span dir="ltr">{row.time}</span>,
    },
    {
      key: "patient", header: t("today.col_patient"),
      cell: (row) => {
        const patient = patients[row.patient_id];
        return (
          <span className="flex items-center gap-2">
            <span className="font-medium text-foreground">{patient ? patientName(patient, lang) : row.patient_id}</span>
            {row.is_new && <StatusPill variant="active" label={t("today.badge_new")} />}
          </span>
        );
      },
    },
    {
      key: "provider", header: t("today.col_provider"),
      cell: (row) => {
        const provider = providers.find((p) => p.id === row.provider_id);
        return provider ? providerName(provider, lang) : row.provider_id;
      },
    },
    {
      key: "status", header: t("today.col_status"),
      cell: (row) => <StatusPill variant={STATUS_VARIANT[row.status]} label={t(`status.${row.status}`)} />,
    },
    {
      key: "financial", header: t("today.col_financial"), numeric: true,
      cell: (row) => {
        if (row.patient_portion == null) return <span className="text-muted-foreground">—</span>;
        const collectedSemantic = row.status === "completed" && row.collected;
        return (
          <span className={cn("tabular-nums", collectedSemantic ? "text-success-text" : "text-danger-text")}>
            {formatMoney(row.patient_portion, lang)}
          </span>
        );
      },
    },
    {
      key: "action", header: t("today.col_action"),
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.sync !== "synced" && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap",
                row.sync === "local" ? "bg-warning-tint text-warning-text" : "bg-brand-tint text-brand-text"
              )}
            >
              {row.sync === "local" ? t("today.sync_local") : t("today.sync_syncing")}
            </span>
          )}
          {renderAction(row)}
        </div>
      ),
    },
  ];

  return (
    <div>
      {isOffline && <OfflineBanner message={t("today.offline_note")} />}

      <PageHeader
        title={t("today.title")}
        subtitle={formatDate(new Date())}
        actions={
          <>
            <Select value={providerFilter} onValueChange={setProviderFilter} disabled={!canViewAll}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {canViewAll && <SelectItem value="all">{t("today.provider_all")}</SelectItem>}
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{providerName(p, lang)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setBookOpen(true)}>
              <Plus className="h-4 w-4 me-1.5" /> {t("today.book_cta")}
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={CalendarClock} label={t("today.kpi_appointments")} value={String(kpis.appointments)} />
          <KpiCard icon={Clock} label={t("today.kpi_waiting")} value={String(kpis.waiting)} tone="warning" />
          <KpiCard icon={CheckCircle2} label={t("today.kpi_completed")} value={String(kpis.completed)} tone="success" />
          <KpiCard icon={Wallet} label={t("today.kpi_due")} value={formatMoney(kpis.dueToday, lang)} tone="brand" />
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={6} rows={5} />
      ) : error ? (
        <ErrorState title={t("today.error_title")} description={t("today.error_body")} onRetry={reload} />
      ) : allRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded bg-muted text-muted-foreground">
            <CalendarDays className="h-6 w-6" />
          </div>
          <p className="font-medium">{t("today.empty_title")}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setBookOpen(true)}>{t("today.empty_book")}</Button>
            <Button size="sm" variant="outline" onClick={() => toast.info(t("today.empty_tomorrow_note"))}>
              {t("today.empty_tomorrow")}
            </Button>
          </div>
        </div>
      ) : noResults ? (
        <EmptyState
          title={t("today.no_results_title")}
          description={t("today.no_results_body")}
          action={{ label: t("today.clear_filters"), onClick: clearFilters }}
        />
      ) : (
        <div className="rounded-lg border border-border overflow-auto">
          <DataTable columns={columns} data={filtered} keyExtractor={(r) => r.appointment_id} />
        </div>
      )}

      <QuickBookDialog open={bookOpen} onOpenChange={setBookOpen} />
    </div>
  );
}
