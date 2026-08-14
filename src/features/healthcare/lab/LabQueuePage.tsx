import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Clock, CheckCircle2, PackageCheck, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatTime } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useHealthcareClinical } from "@/stores/healthcareClinical";
import { useHealthcarePatients } from "@/stores/healthcarePatients";
import { useMockState } from "../useMockState";
import { getProvider, patientName, providerName } from "@/lib/mock/healthcare";
import { ResultEntryModal } from "./ResultEntryModal";
import type { HcOrder } from "@/features/healthcare/types";

type StatusFilter = "all" | "pending" | "in_progress" | "ready" | "delivered";
type TypeFilter = "all" | "lab" | "radiology";

interface LabRow {
  order: HcOrder;
  patientId: string;
  providerId: string;
}

const STATUS_VARIANT: Record<HcOrder["status"], PillVariant> = {
  pending: "pending", in_progress: "in-progress", ready: "approved", delivered: "approved", issued: "approved",
};

/**
 * /healthcare/lab — Lab/Radiology queue & results (spec §7). Single-audience
 * technician workspace (§7.1) — the whole page gates on `healthcare.lab.manage`
 * (the only lab permission the catalog defines, §11) rather than a separate
 * view/manage split. "Reception sees status only, not value" (§7.4) is
 * structurally true regardless: the queue's own columns never render a
 * result's value, only its status — that's not a per-row PHI check, it's
 * just not a column here at all.
 */
export function LabQueuePage() {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const can = useCan();

  const orders = useHealthcareClinical((s) => s.orders);
  const encounters = useHealthcareClinical((s) => s.encounters);
  const resultSync = useHealthcareClinical((s) => s.resultSync);
  const deliverResult = useHealthcareClinical((s) => s.deliverResult);
  const patients = useHealthcarePatients((s) => s.patients);

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [resultOrder, setResultOrder] = useState<HcOrder | null>(null);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  const allRows: LabRow[] = useMemo(() => {
    if (forcedEmpty) return [];
    return Object.values(orders)
      .filter((o) => o.type === "lab" || o.type === "radiology")
      .map((order) => {
        const encounter = encounters[order.encounter_id];
        if (!encounter) return null;
        return { order, patientId: encounter.patient_id, providerId: encounter.provider_id };
      })
      .filter((r): r is LabRow => !!r)
      .sort((a, b) => (b.order.requested_at ?? "").localeCompare(a.order.requested_at ?? ""));
  }, [orders, encounters, forcedEmpty]);

  const filtered = useMemo(() => {
    let list = allRows;
    if (statusFilter !== "all") list = list.filter((r) => r.order.status === statusFilter);
    if (typeFilter !== "all") list = list.filter((r) => r.order.type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => {
        const p = patients[r.patientId];
        return p ? patientName(p, lang).toLowerCase().includes(q) || (p.phone ?? "").includes(q) : false;
      });
    }
    return list;
  }, [allRows, statusFilter, typeFilter, search, patients, lang]);

  const noResults = forcedNoResults || (allRows.length > 0 && filtered.length === 0);

  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const pending = allRows.filter((r) => r.order.status === "pending" || r.order.status === "in_progress").length;
    const readyToday = allRows.filter((r) => r.order.status === "ready" && (r.order.requested_at ?? "").slice(0, 10) <= today).length;
    const delivered = allRows.filter((r) => r.order.status === "delivered").length;
    return { pending, readyToday, delivered };
  }, [allRows]);

  function clearFilters() {
    setStatusFilter("all"); setTypeFilter("all"); setSearch("");
  }

  function handleNotify() {
    toast.success(t("lab.notify_sent"));
  }

  if (!can("healthcare.lab.manage")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("lab.permission_required")}</p>
      </div>
    );
  }

  function renderAction(row: LabRow) {
    const { order } = row;
    if (order.status === "pending" || order.status === "in_progress") {
      return <Button size="sm" onClick={() => setResultOrder(order)}>{t("lab.enter_result")}</Button>;
    }
    if (order.status === "ready") {
      return (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleNotify}>{t("lab.notify_patient")}</Button>
          <Button size="sm" onClick={() => deliverResult(order.id)}>{t("lab.deliver")}</Button>
        </div>
      );
    }
    return <StatusPill variant="approved" label={t("orderStatus.delivered")} />;
  }

  const columns: Column<LabRow>[] = [
    {
      key: "order", header: t("lab.col_order"),
      cell: ({ order }) => (
        <div>
          <span className="font-mono text-xs" dir="ltr">{order.id}</span>
          {order.requested_at && <span className="block text-xs text-muted-foreground tabular-nums" dir="ltr">{formatTime(order.requested_at)}</span>}
        </div>
      ),
    },
    {
      key: "patient", header: t("lab.col_patient"),
      cell: ({ patientId }) => { const p = patients[patientId]; return p ? patientName(p, lang) : patientId; },
    },
    {
      key: "provider", header: t("lab.col_provider"),
      cell: ({ providerId }) => { const p = getProvider(providerId); return p ? providerName(p, lang) : providerId; },
    },
    {
      key: "type", header: t("lab.col_type"),
      cell: ({ order }) => (
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t(`lab.type_${order.type}`)}</span>
          <span>{order.name_ar}</span>
        </span>
      ),
    },
    {
      key: "status", header: t("lab.col_status"),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <StatusPill variant={STATUS_VARIANT[row.order.status]} label={t(`orderStatus.${row.order.status}`)} />
          {resultSync[row.order.id] && resultSync[row.order.id] !== "synced" && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              resultSync[row.order.id] === "local" ? "bg-warning-tint text-warning-text" : "bg-brand-tint text-brand-text"
            )}>
              {resultSync[row.order.id] === "local" ? t("today.sync_local") : t("today.sync_syncing")}
            </span>
          )}
        </div>
      ),
    },
    { key: "action", header: t("lab.col_action"), cell: (row) => <div className="flex justify-end">{renderAction(row)}</div> },
  ];

  return (
    <div>
      {isOffline && <OfflineBanner message={t("lab.offline_note")} />}

      <PageHeader title={t("lab.title")} />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KpiCard icon={Clock} label={t("lab.kpi_pending")} value={String(kpis.pending)} tone="warning" />
          <KpiCard icon={CheckCircle2} label={t("lab.kpi_ready")} value={String(kpis.readyToday)} tone="success" />
          <KpiCard icon={PackageCheck} label={t("lab.kpi_delivered")} value={String(kpis.delivered)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center mb-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("lab.search_placeholder")} className="h-9 max-w-xs" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("patients.filter_all")}</SelectItem>
            <SelectItem value="pending">{t("orderStatus.pending")}</SelectItem>
            <SelectItem value="in_progress">{t("orderStatus.in_progress")}</SelectItem>
            <SelectItem value="ready">{t("orderStatus.ready")}</SelectItem>
            <SelectItem value="delivered">{t("orderStatus.delivered")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("patients.filter_all")}</SelectItem>
            <SelectItem value="lab">{t("lab.type_lab")}</SelectItem>
            <SelectItem value="radiology">{t("lab.type_radiology")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton cols={6} rows={5} />
      ) : error ? (
        <ErrorState title={t("lab.error_title")} onRetry={reload} />
      ) : allRows.length === 0 ? (
        <EmptyState icon={FlaskConical} title={t("lab.empty_title")} description={t("lab.empty_body")} />
      ) : noResults ? (
        <EmptyState
          title={t("today.no_results_title")}
          description={t("today.no_results_body")}
          action={{ label: t("today.clear_filters"), onClick: clearFilters }}
        />
      ) : (
        <div className="rounded-lg border border-border overflow-auto">
          <DataTable columns={columns} data={filtered} keyExtractor={(r) => r.order.id} />
        </div>
      )}

      <ResultEntryModal order={resultOrder} onOpenChange={(o) => { if (!o) setResultOrder(null); }} />
    </div>
  );
}
