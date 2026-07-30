import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useReactTable, getCoreRowModel, getPaginationRowModel, flexRender, createColumnHelper,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, History, Lock } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton } from "@/components/patterns/Skeletons";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatDate, formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePlaySessions } from "@/stores/playSessions";
import { usePlayDevices } from "@/stores/playDevices";
import { usePlayDeviceTypes } from "@/stores/playDeviceTypes";
import { usePlayRatePlans } from "@/stores/playRatePlans";
import { usePlayChecks } from "@/stores/playChecks";
import { usePlayDocuments } from "@/stores/playDocuments";
import { getShift } from "@/lib/mock/play";
import { sessionTotal } from "@/features/play/rate-engine";
import type { DeviceType, RatePlan, Session, TimeSegment } from "@/features/play/types";
import { cafeteriaTotal, elapsedMs, formatDuration } from "@/features/play/floor/sessionDisplay";
import {
  applySessionLogFilters, closedSessions, filterByRowScope, sessionDateISO, type SessionLogFilterValues,
} from "./sessionLogFilters";
import { useSessionLog } from "./useSessionLog";

const STATUS_PILL: Record<string, PillVariant> = { paid: "paid", cancelled: "inactive" };
const PAGE_SIZE = 10;
const EMPTY_FILTERS: SessionLogFilterValues = { dateFrom: "", dateTo: "", deviceTypeId: "all", status: "all", mode: "all" };

const colHelper = createColumnHelper<Session>();

/**
 * Session log (§9, back-office). Every hook (state/memo/`useReactTable`) is called
 * unconditionally on every render — permission/loading/error/empty are all decided as plain
 * booleans and branched on ONLY inside the final JSX, never via an early `return` before a
 * hook (a real TanStack table instance can't be built conditionally without breaking the
 * Rules of Hooks, unlike the simpler settings screens that use the lightweight `DataTable`
 * pattern and can afford early returns).
 */
export default function SessionLogPage() {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();
  const can = useCan();

  const sessions = usePlaySessions((s) => s.sessions);
  const devices = usePlayDevices((s) => s.devices);
  const deviceTypes = usePlayDeviceTypes((s) => s.deviceTypes);
  const ratePlans = usePlayRatePlans((s) => s.ratePlans);
  const checks = usePlayChecks((s) => s.checks);
  const documents = usePlayDocuments((s) => s.documents);

  const { loading, error, isOffline, forcedEmpty, reload } = useSessionLog();

  const [filters, setFilters] = useState<SessionLogFilterValues>(EMPTY_FILTERS);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function deviceTypeName(dt: DeviceType | undefined) {
    return dt ? (lang === "ar" ? dt.name_ar : dt.name_en) : "—";
  }

  /** A device_id may reference a device that no longer exists under that id (transfer/history
   * leaves behind ids like "dev_bl_2_prev") — falls back to the device TYPE's name, same
   * convention already used by `SessionCardDrawer`/`EndBillDialog`'s own `deviceNameFor`. */
  function deviceName(deviceId: string | null, dt: DeviceType | undefined) {
    if (deviceId) {
      const d = devices[deviceId];
      if (d) return d.name;
    }
    return deviceTypeName(dt);
  }

  function ratePlanFor(session: Session): RatePlan | undefined {
    const dt = deviceTypes[session.device_type_id];
    return dt ? ratePlans[dt.rate_plan_id] : undefined;
  }

  function grandTotalFor(session: Session): number {
    const doc = session.document_id ? documents[session.document_id] : undefined;
    if (doc) return doc.grand_total;
    const ratePlan = ratePlanFor(session);
    if (!ratePlan) return 0;
    const { timeTotal } = sessionTotal(session, ratePlan, new Date());
    const check = Object.values(checks).find((c) => c.session_id === session.id);
    return timeTotal + cafeteriaTotal(check);
  }

  function etaLabel(status: string | undefined): string {
    switch (status) {
      case "valid": return t("log.eta_issued");
      case "queued": return t("log.eta_queued");
      case "flagged_missing_code": return t("log.eta_flagged");
      case "reversed": return t("log.eta_reversed");
      default: return "—";
    }
  }

  function windowLabel(segment: TimeSegment, ratePlan: RatePlan | undefined): string {
    if (!segment.rule_id) return t("log.window_prepaid");
    const rule = ratePlan?.rules.find((r) => r.id === segment.rule_id);
    if (!rule) return "—";
    if (!rule.window) return t("log.window_flat");
    const days = rule.window.days.map((d) => t(`rate.day_${d.toLowerCase()}`)).join("، ");
    return `${days} ${rule.window.from}–${rule.window.to}`;
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  // Row scope (§9): "play.view.all" is a distinct, separately-gated permission from the base
  // "play.view" checked below — a cashier with only "play.view" sees just their own sessions.
  // `useCan()` is a project-wide always-true stub today (no real role plumbing exists yet for
  // Play), so this reads as "everyone sees everything" in practice — but the filter itself is
  // real and unit-tested (`sessionLogFilters.test.ts`), ready for when that stub is replaced.
  const canView = can("play.view");
  const canViewAll = can("play.view.all");
  const currentCashierId = getShift().cashier_id;

  const allSessions = forcedEmpty ? [] : Object.values(sessions);
  const closed = closedSessions(allSessions);
  const scoped = filterByRowScope(closed, canViewAll, currentCashierId);
  const filtered = applySessionLogFilters(scoped, filters);
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (sessionDateISO(b) ?? "").localeCompare(sessionDateISO(a) ?? "")),
    [filtered]
  );

  const columns = useMemo(() => [
    colHelper.display({
      id: "expand",
      header: () => "",
      cell: (info) => {
        const isOpen = expanded.has(info.row.original.id);
        const Icon = isOpen ? ChevronDown : ChevronRight;
        return <Icon className="h-4 w-4 text-muted-foreground" />;
      },
    }),
    colHelper.accessor((s) => sessionDateISO(s), {
      id: "date",
      header: () => t("log.col_date"),
      cell: (info) => {
        const iso = info.getValue();
        return <span className="text-sm tabular-nums whitespace-nowrap" dir="ltr">{iso ? formatDate(iso) : "—"}</span>;
      },
    }),
    colHelper.display({
      id: "device",
      header: () => t("log.col_device"),
      cell: (info) => {
        const s = info.row.original;
        return <span className="text-sm font-medium">{deviceName(s.device_id, deviceTypes[s.device_type_id])}</span>;
      },
    }),
    colHelper.accessor("mode", {
      id: "mode",
      header: () => t("log.col_mode"),
      cell: (info) => <span className="text-sm text-muted-foreground">{t(`mode.${info.getValue()}`)}</span>,
    }),
    colHelper.display({
      id: "duration",
      header: () => t("log.col_duration"),
      cell: (info) => (
        <span className="text-sm tabular-nums" dir="ltr">{formatDuration(elapsedMs(info.row.original, new Date()))}</span>
      ),
    }),
    colHelper.display({
      id: "total",
      header: () => t("log.col_total"),
      cell: (info) => <span className="text-sm font-semibold tabular-nums">{formatMoney(grandTotalFor(info.row.original), lang)}</span>,
    }),
    colHelper.accessor("state", {
      id: "status",
      header: () => t("log.col_status"),
      cell: (info) => {
        const state = info.getValue();
        return <StatusPill variant={STATUS_PILL[state] ?? "default"} label={t(`log.status_${state}`)} />;
      },
    }),
    colHelper.accessor("eta_status", {
      id: "eta",
      header: () => t("log.col_eta"),
      cell: (info) => <span className="text-xs text-muted-foreground">{etaLabel(info.getValue())}</span>,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, lang, deviceTypes, devices, expanded, documents, checks, ratePlans]);

  const table = useReactTable({
    data: sorted,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination },
    onPaginationChange: setPagination,
  });

  const isEmpty = scoped.length === 0;
  const noResults = !isEmpty && (forcedNoResults || filtered.length === 0);
  const showSkeleton = loading;
  const showError = !!error;
  const showContent = canView && !showSkeleton && !showError;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("log.title")}
        count={showContent && scoped.length > 0 ? t("dev.count", { n: scoped.length }) : undefined}
        alert={showContent && isOffline ? <OfflineBanner message={t("log.offline_note")} /> : undefined}
      />

      {!canView ? (
        <PageSection>
          <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-16 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("log.permission_required")}</p>
          </div>
        </PageSection>
      ) : showSkeleton ? (
        <PageSection padded={false}><TableSkeleton rows={6} cols={7} /></PageSection>
      ) : showError ? (
        <PageSection><ErrorState title={t("log.error_title")} description={t("log.error_body")} onRetry={reload} /></PageSection>
      ) : (
        <PageSection padded={false}>
          <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="w-auto h-10"
              title={t("log.filter_date_from")}
              aria-label={t("log.filter_date_from")}
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="w-auto h-10"
              title={t("log.filter_date_to")}
              aria-label={t("log.filter_date_to")}
            />
            <Select value={filters.deviceTypeId} onValueChange={(v) => setFilters((f) => ({ ...f, deviceTypeId: v }))}>
              <SelectTrigger className="w-44 h-10"><SelectValue placeholder={t("log.filter_device_type")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("log.filter_device_type_all")}</SelectItem>
                {Object.values(deviceTypes).map((dt) => (
                  <SelectItem key={dt.id} value={dt.id}>{deviceTypeName(dt)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="w-36 h-10"><SelectValue placeholder={t("log.filter_status")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("log.filter_status_all")}</SelectItem>
                <SelectItem value="paid">{t("log.status_paid")}</SelectItem>
                <SelectItem value="cancelled">{t("log.status_cancelled")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.mode} onValueChange={(v) => setFilters((f) => ({ ...f, mode: v }))}>
              <SelectTrigger className="w-36 h-10"><SelectValue placeholder={t("log.filter_mode")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("log.filter_mode_all")}</SelectItem>
                <SelectItem value="postpaid">{t("mode.postpaid")}</SelectItem>
                <SelectItem value="prepaid">{t("mode.prepaid")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isEmpty ? (
            <EmptyState icon={History} title={t("log.empty_title")} description={t("log.empty_body")} />
          ) : noResults ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("log.no_results_title")}</p>
              <p className="text-xs text-muted-foreground">{t("log.no_results_body")}</p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>{t("log.clear_filters")}</Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id} className="hover:bg-transparent border-b border-border">
                        {hg.headers.map((header) => (
                          <TableHead key={header.id}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => {
                      const session = row.original;
                      const isOpen = expanded.has(session.id);
                      const ratePlan = ratePlanFor(session);
                      const priced = ratePlan ? sessionTotal(session, ratePlan, new Date()).segments : [];
                      return (
                        <Fragment key={session.id}>
                          <TableRow
                            className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                            onClick={() => toggleExpand(session.id)}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                          {isOpen && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={columns.length} className="bg-muted/20 p-0">
                                <div className="p-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead>{t("log.seg_device")}</TableHead>
                                        <TableHead>{t("log.seg_window")}</TableHead>
                                        <TableHead>{t("log.seg_rate")}</TableHead>
                                        <TableHead>{t("log.seg_units")}</TableHead>
                                        <TableHead>{t("log.seg_subtotal")}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {priced.map((piece) => (
                                        <TableRow key={piece.segment.id} className="hover:bg-transparent">
                                          <TableCell className="text-sm">
                                            {deviceName(piece.segment.device_id, deviceTypes[session.device_type_id])}
                                          </TableCell>
                                          <TableCell className="text-sm text-muted-foreground">
                                            {windowLabel(piece.segment, ratePlan)}
                                          </TableCell>
                                          <TableCell className="text-sm tabular-nums">{formatMoney(piece.pricePerUnit, lang)}</TableCell>
                                          <TableCell className="text-sm tabular-nums">{piece.units}</TableCell>
                                          <TableCell className="text-sm font-medium tabular-nums">{formatMoney(piece.subtotal, lang)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("log.page_info", {
                    from: pagination.pageIndex * pagination.pageSize + 1,
                    to: Math.min((pagination.pageIndex + 1) * pagination.pageSize, filtered.length),
                    total: filtered.length,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                    {t("log.prev_page")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    {t("log.next_page")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </PageSection>
      )}
    </div>
  );
}
