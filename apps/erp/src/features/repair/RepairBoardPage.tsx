import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, LayoutGrid, List as ListIcon, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { StatusPill } from "@/components/patterns/StatusPill";
import { formatDate, formatMoney } from "@/lib/format";
import { useAppearance, dirOf } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useRprWorkOrders } from "@/stores/rprWorkOrders";
import {
  BOARD_STATUSES, ALL_STATUSES, TECHNICIANS,
  findCustomer, customerName, findTechnician, technicianName, deviceLabel,
  statusPillVariant, isOverdue, type RprWorkOrder, type RprWoStatus,
} from "./catalog";
import { useRepairBoard } from "./useRepairBoard";
import { WorkOrderCard } from "./WorkOrderCard";

type ViewMode = "kanban" | "list";
type PeriodFilter = "all" | "today" | "week" | "month";

function useIsMobile(breakpointPx = 640): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpointPx);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpointPx]);
  return isMobile;
}

function BoardSkeleton() {
  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-lg" />
      ))}
    </div>
  );
}

function inPeriod(dateStr: string, period: PeriodFilter): boolean {
  if (period === "all") return true;
  const now = new Date();
  if (period === "today") return dateStr === now.toISOString().slice(0, 10);
  const diffDays = (now.getTime() - new Date(dateStr).getTime()) / 86400000;
  if (period === "week") return diffDays >= 0 && diffDays <= 7;
  if (period === "month") return diffDays >= 0 && diffDays <= 31;
  return true;
}

export default function RepairBoardPage() {
  const { t } = useTranslation("repair");
  const { lang } = useAppearance();
  const dir = dirOf(lang);
  const can = useCan();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const workOrdersDict = useRprWorkOrders((s) => s.workOrders);
  const { loading, error, isOffline, forcedEmpty, reload } = useRepairBoard();

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RprWoStatus>("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [mobileStatus, setMobileStatus] = useState<RprWoStatus>("pending_diagnosis");

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  const allWorkOrders = forcedEmpty ? [] : Object.values(workOrdersDict);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allWorkOrders.filter((wo) => {
      if (statusFilter !== "all" && wo.status !== statusFilter) return false;
      if (technicianFilter !== "all" && wo.technician_id !== technicianFilter) return false;
      if (overdueOnly && !isOverdue(wo)) return false;
      if (!inPeriod(wo.intake_at, periodFilter)) return false;
      if (q) {
        const customer = findCustomer(wo.customer_id);
        const haystack = [wo.number, customer ? customerName(customer, lang) : "", deviceLabel(wo.device)]
          .join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allWorkOrders, statusFilter, technicianFilter, overdueOnly, periodFilter, search, lang]);

  const noResults = forcedNoResults || (allWorkOrders.length > 0 && filtered.length === 0);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setTechnicianFilter("all");
    setOverdueOnly(false);
    setPeriodFilter("all");
  }

  if (!can("repair.wo.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("board.permission_required")}</p>
      </div>
    );
  }

  const columns: Column<RprWorkOrder>[] = [
    { key: "number", header: "WO", cell: (wo) => <span className="font-mono text-xs" dir="ltr">{wo.number}</span> },
    {
      key: "customer", header: t("board.col_customer"),
      cell: (wo) => { const c = findCustomer(wo.customer_id); return c ? customerName(c, lang) : wo.customer_id; },
    },
    { key: "device", header: t("board.col_device"), cell: (wo) => deviceLabel(wo.device) || "—" },
    {
      key: "technician", header: t("board.col_technician"),
      cell: (wo) => { const tc = findTechnician(wo.technician_id); return tc ? technicianName(tc, lang) : "—"; },
    },
    {
      key: "status", header: t("board.col_status"),
      cell: (wo) => <StatusPill variant={statusPillVariant(wo.status)} label={t(`status.${wo.status}`)} />,
    },
    {
      key: "promise", header: t("board.col_promise"), numeric: true,
      cell: (wo) => (
        <span className="flex items-center gap-1.5 tabular-nums">
          {isOverdue(wo) && <StatusPill variant="rejected" label={t("board.overdue")} />}
          {formatDate(wo.promise_at)}
        </span>
      ),
    },
    {
      key: "total", header: t("board.col_total"), numeric: true,
      cell: (wo) => (wo.quote ? formatMoney(wo.quote.total, lang) : "—"),
    },
    {
      key: "actions", header: t("board.col_actions"),
      cell: (wo) => (
        <Button variant="outline" size="sm" onClick={() => navigate(`/repair/${wo.id}`)}>
          {t("board.open")}
        </Button>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {isOffline && <OfflineBanner message={t("board.offline_note")} />}

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <h1 className="text-base font-semibold text-foreground shrink-0">{t("board.title")}</h1>

        <div className="flex-1" />

        {!isMobile && (
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-9 p-1 bg-muted">
              <TabsTrigger value="kanban" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <LayoutGrid className="h-3.5 w-3.5 me-1.5" /> {t("board.view_kanban")}
              </TabsTrigger>
              <TabsTrigger value="list" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <ListIcon className="h-3.5 w-3.5 me-1.5" /> {t("board.view_list")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {can("repair.wo.create") && (
          <Button size="sm" onClick={() => navigate("/repair/new")}>
            <Plus className="h-4 w-4 me-1.5" /> {t("intake.new")}
          </Button>
        )}
      </div>

      {/* Toolbar — search + filters */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("board.search_placeholder")}
          className="h-9 max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | RprWoStatus)}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder={t("board.filter_status")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("board.filter_all")}</SelectItem>
            {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder={t("board.filter_technician")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("board.filter_all")}</SelectItem>
            {TECHNICIANS.map((tc) => <SelectItem key={tc.id} value={tc.id}>{technicianName(tc, lang)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder={t("board.filter_period")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("board.filter_all")}</SelectItem>
            <SelectItem value="today">{t("board.period_today")}</SelectItem>
            <SelectItem value="week">{t("board.period_week")}</SelectItem>
            <SelectItem value="month">{t("board.period_month")}</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 h-9 px-1 text-sm text-foreground">
          <Switch checked={overdueOnly} onCheckedChange={setOverdueOnly} />
          {t("board.filter_overdue")}
        </label>
      </div>

      {/* Body — five states */}
      {loading ? (
        <BoardSkeleton />
      ) : error ? (
        <ErrorState title={t("board.error_title")} description={t("board.error_body")} onRetry={reload} />
      ) : allWorkOrders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t("board.empty")}
          action={can("repair.wo.create") ? { label: t("board.empty_action"), onClick: () => navigate("/repair/new") } : undefined}
        />
      ) : noResults ? (
        <EmptyState
          title={t("board.no_results_title")}
          description={t("board.no_results_body")}
          action={{ label: t("board.clear_filters"), onClick: clearFilters }}
        />
      ) : isMobile ? (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <Tabs value={mobileStatus} onValueChange={(v) => setMobileStatus(v as RprWoStatus)}>
            <TabsList className="h-auto p-1 flex-wrap justify-start bg-muted gap-1">
              {BOARD_STATUSES.map((s) => (
                <TabsTrigger key={s} value={s} className="h-9 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  {t(`status.${s}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex-1 min-h-0 overflow-auto space-y-2">
            {filtered.filter((wo) => wo.status === mobileStatus).map((wo) => (
              <WorkOrderCard key={wo.id} workOrder={wo} lang={lang} onClick={() => navigate(`/repair/${wo.id}`)} />
            ))}
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3" dir={dir}>
          {BOARD_STATUSES.map((s) => {
            const items = filtered.filter((wo) => wo.status === s);
            return (
              <div key={s} className="flex flex-col min-h-0 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                  <span className="text-xs font-semibold text-foreground">{t(`status.${s}`)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                </div>
                <div className="flex-1 min-h-0 overflow-auto p-2 space-y-2">
                  {items.map((wo) => (
                    <WorkOrderCard key={wo.id} workOrder={wo} lang={lang} onClick={() => navigate(`/repair/${wo.id}`)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border">
          <DataTable columns={columns} data={filtered} keyExtractor={(wo) => wo.id} />
        </div>
      )}
    </div>
  );
}
