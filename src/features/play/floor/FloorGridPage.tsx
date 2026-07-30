import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Gamepad2, Plus, Lock, LayoutGrid } from "lucide-react";

import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePosTerminalSettings } from "@/stores/posTerminalSettings";
import { GridDensity } from "@/features/pos/GridDensity";
import { usePlayDevices } from "@/stores/playDevices";
import { usePlayDeviceTypes } from "@/stores/playDeviceTypes";
import { usePlayRatePlans } from "@/stores/playRatePlans";
import { usePlaySessions } from "@/stores/playSessions";
import { getShift, getChecks } from "@/lib/mock/play";
import type { Device, DeviceState, Session } from "@/features/play/types";
import { DEVICE_TYPE_ICONS } from "@/features/play/settings/deviceTypeOptions";
import { DeviceCard } from "./DeviceCard";
import {
  computeRunningTotal, elapsedMs, findDeviceSession, findTicketSessions, formatDuration, remainingMsForPrepaid,
} from "./sessionDisplay";
import { useFloorGrid } from "./useFloorGrid";

const DEVICE_STATES: DeviceState[] = ["free", "busy", "reserved", "paused", "out_of_service"];

function FloorGridSkeleton({ density }: { density: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full max-w-md" />
      <div
        className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-[repeat(var(--play-density),minmax(0,1fr))]"
        style={{ "--play-density": density } as CSSProperties}
      >
        {Array.from({ length: density * 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function FloorGridPage() {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();

  const devices = usePlayDevices((s) => s.devices);
  const deviceTypes = usePlayDeviceTypes((s) => s.deviceTypes);
  const ratePlans = usePlayRatePlans((s) => s.ratePlans);
  const sessions = usePlaySessions((s) => s.sessions);
  const tick = usePlaySessions((s) => s.tick);
  // Subscribing to `clock` (never read directly) is what makes this component re-render
  // every tick so cards recompute their live numbers — the ONE shared interval lives below,
  // there is no per-card timer anywhere.
  usePlaySessions((s) => s.clock);

  const gridDensity = usePosTerminalSettings((s) => s.gridDensity);
  const setGridDensity = usePosTerminalSettings((s) => s.setGridDensity);

  const { loading, error, isOffline, forcedEmpty, reload } = useFloorGrid();

  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  if (!can("play.operate")) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full flex flex-col items-center gap-3 text-center">
          <Lock className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("floor.permission_required")}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4"><FloorGridSkeleton density={gridDensity} /></div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorState title={t("floor.error_title")} description={t("floor.error_body")} onRetry={reload} />
      </div>
    );
  }

  const shift = getShift();
  const now = new Date();
  const allSessions = Object.values(sessions);

  const allDeviceTypes = Object.values(deviceTypes);
  // Branch scope (§4.6): out-of-scope devices are hidden, never errored — a plain filter,
  // applied before any of the five-states logic below ever sees the array.
  const allDevicesInBranch = Object.values(devices).filter((d) => d.branch_id === shift.branch_id);
  const scopedDevices = forcedEmpty ? [] : allDevicesInBranch;
  const allTicketTypes = forcedEmpty ? [] : allDeviceTypes.filter((dt) => dt.occupancy === "ticket");

  const nothingAtAll = scopedDevices.length === 0 && allTicketTypes.length === 0;

  const typeFilteredDevices = typeFilter === "all"
    ? scopedDevices
    : scopedDevices.filter((d) => d.device_type_id === typeFilter);
  const filteredDevices = stateFilter === "all"
    ? typeFilteredDevices
    : typeFilteredDevices.filter((d) => d.state === stateFilter);

  const ticketTypesShown = allTicketTypes.filter((dt) => typeFilter === "all" || typeFilter === dt.id);

  const noResults = forcedNoResults || (!nothingAtAll && filteredDevices.length === 0 && ticketTypesShown.length === 0);

  function deviceTypeName(dt: { name_ar: string; name_en: string }) {
    return lang === "ar" ? dt.name_ar : dt.name_en;
  }

  function checkFor(session: Session) {
    return getChecks().find((c) => c.session_id === session.id);
  }

  function handleTap() {
    toast.info(t("floor.stub_toast"));
  }

  function clearFilters() {
    setTypeFilter("all");
    setStateFilter("all");
  }

  function renderDeviceCard(device: Device) {
    const dt = deviceTypes[device.device_type_id];
    const Icon = (dt && DEVICE_TYPE_ICONS[dt.icon]) ?? Gamepad2;
    const session = findDeviceSession(allSessions, device.id);
    const ratePlan = dt ? ratePlans[dt.rate_plan_id] : undefined;
    const check = session ? checkFor(session) : undefined;

    let counterText: string | undefined;
    let counterDirection: "up" | "down" | undefined;
    let runningTotalText: string | undefined;

    if (session) {
      if (session.mode === "prepaid") {
        counterText = formatDuration(remainingMsForPrepaid(session, now));
        counterDirection = "down";
      } else {
        counterText = formatDuration(elapsedMs(session, now));
        counterDirection = "up";
      }
      const total = computeRunningTotal(session, ratePlan, check, now);
      if (total !== null) runningTotalText = formatMoney(total, lang);
    }

    return (
      <DeviceCard
        key={device.id}
        name={device.name}
        Icon={Icon}
        state={device.state}
        stateLabel={t(`device.${device.state === "out_of_service" ? "oos" : device.state}`)}
        counterText={counterText}
        counterDirection={counterDirection}
        runningTotalText={runningTotalText}
        hasCafeteria={(check?.cafeteria_lines.length ?? 0) > 0}
        note={device.notes || undefined}
        onClick={handleTap}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {isOffline && <OfflineBanner message={t("floor.offline_note")} />}

      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-11"><SelectValue placeholder={t("floor.filter_type")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("floor.filter_type_all")}</SelectItem>
            {allDeviceTypes.map((dt) => (
              <SelectItem key={dt.id} value={dt.id}>{deviceTypeName(dt)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-40 h-11"><SelectValue placeholder={t("floor.filter_state")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("floor.filter_state_all")}</SelectItem>
            {DEVICE_STATES.map((s) => (
              <SelectItem key={s} value={s}>{t(`device.${s === "out_of_service" ? "oos" : s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ms-auto">
          <GridDensity value={gridDensity} onChange={setGridDensity} />
        </div>
      </div>

      {nothingAtAll ? (
        <EmptyState
          icon={LayoutGrid}
          title={t("floor.empty_title")}
          description={t("floor.empty_body")}
          action={can("play.config") ? { label: t("floor.empty_action"), onClick: () => navigate("/settings/play/devices") } : undefined}
        />
      ) : noResults ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">{t("floor.no_results_title")}</p>
          <p className="text-xs text-muted-foreground">{t("floor.no_results_body")}</p>
          <Button variant="ghost" size="sm" onClick={clearFilters}>{t("floor.clear_filters")}</Button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto space-y-5">
          {filteredDevices.length > 0 && (
            <div
              className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-[repeat(var(--play-density),minmax(0,1fr))]"
              style={{ "--play-density": gridDensity } as CSSProperties}
            >
              {filteredDevices.map(renderDeviceCard)}
            </div>
          )}

          {ticketTypesShown.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("floor.ticket_zone_title")}
              </p>
              {ticketTypesShown.map((dt) => {
                const Icon = DEVICE_TYPE_ICONS[dt.icon] ?? Gamepad2;
                const ticketSessions = findTicketSessions(allSessions, dt.id);
                const ratePlan = ratePlans[dt.rate_plan_id];

                return (
                  <div key={dt.id} className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">{deviceTypeName(dt)}</p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleTap}
                        className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border p-3 text-center min-h-[112px] w-32 text-muted-foreground hover:border-brand/40 hover:text-foreground transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="text-xs font-semibold">{t("new_session")}</span>
                        {ticketSessions.length > 0 && (
                          <span className="text-[10px]">{t("floor.active_count", { n: ticketSessions.length })}</span>
                        )}
                      </button>

                      {ticketSessions.map((session) => {
                        const check = checkFor(session);
                        const elapsedOrRemaining = session.mode === "prepaid"
                          ? remainingMsForPrepaid(session, now)
                          : elapsedMs(session, now);
                        const total = computeRunningTotal(session, ratePlan, check, now);

                        return (
                          <div key={session.id} className="w-32">
                            <DeviceCard
                              name={session.customer?.name ?? deviceTypeName(dt)}
                              Icon={Icon}
                              state={session.state === "paused" ? "paused" : "busy"}
                              stateLabel={t(session.state === "paused" ? "device.paused" : "device.busy")}
                              counterText={formatDuration(elapsedOrRemaining)}
                              counterDirection={session.mode === "prepaid" ? "down" : "up"}
                              runningTotalText={total !== null ? formatMoney(total, lang) : undefined}
                              hasCafeteria={(check?.cafeteria_lines.length ?? 0) > 0}
                              onClick={handleTap}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
