import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CalendarClock, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Lock, Plus, Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/format";
import { useAppearance, dirOf } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useSvcAppointments, type SvcAppointment } from "@/stores/svcAppointments";
import permissionsFixtures from "@/lib/mock/fixtures/permissions.fixtures.json";
import { PROVIDERS, SERVICES, providerName } from "./catalog";
import type { SvcProvider } from "./catalog";
import { addDays, composeIso, isSameDay, snapMinutes, startOfWeekSat, GRID_START_MIN } from "./scheduling";
import { useCalendar } from "./useCalendar";
import { DayGrid } from "./DayGrid";
import { WeekGrid } from "./WeekGrid";
import { AppointmentDrawer } from "./AppointmentDrawer";

type ViewMode = "day" | "week";
const BRANCHES = permissionsFixtures.branches as { id: string; name_ar: string; name_en: string }[];

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

function CalendarSkeleton() {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 p-2 border border-border rounded-lg">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 flex-1" />)}
      </div>
      <Skeleton className="flex-1 rounded" />
    </div>
  );
}

interface NewSlot { provider: SvcProvider; startIso: string }

export default function CalendarPage() {
  const { t } = useTranslation("svc");
  const { lang } = useAppearance();
  const dir = dirOf(lang);
  const can = useCan();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const appointments = useSvcAppointments((s) => s.appointments);
  const rescheduleAppointment = useSvcAppointments((s) => s.rescheduleAppointment);
  const { loading, error, isOffline, forcedEmpty, reload } = useCalendar();

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const effectiveViewMode: ViewMode = isMobile ? "day" : viewMode;

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [providerFilter, setProviderFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [mobileProviderId, setMobileProviderId] = useState(PROVIDERS[0]?.id ?? "");

  const [newSlot, setNewSlot] = useState<NewSlot | null>(null);
  const [viewingAppointment, setViewingAppointment] = useState<SvcAppointment | null>(null);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  const canBook = can("svc.appointment.book");

  const visibleProviders = useMemo(
    () => PROVIDERS.filter(
      (p) => (providerFilter === "all" || p.id === providerFilter)
        && (serviceFilter === "all" || p.services.includes(serviceFilter))
    ),
    [providerFilter, serviceFilter]
  );

  useEffect(() => {
    if (!visibleProviders.some((p) => p.id === mobileProviderId)) {
      setMobileProviderId(visibleProviders[0]?.id ?? "");
    }
  }, [visibleProviders, mobileProviderId]);

  const dayGridProviders = useMemo(() => {
    if (!isMobile) return visibleProviders;
    const active = visibleProviders.find((p) => p.id === mobileProviderId) ?? visibleProviders[0];
    return active ? [active] : [];
  }, [isMobile, visibleProviders, mobileProviderId]);

  const allAppointments = forcedEmpty ? [] : Object.values(appointments);
  const noResults = forcedNoResults || visibleProviders.length === 0;

  const filteredAppointments = useMemo(
    () => allAppointments.filter(
      (a) => (branchFilter === "all" || a.branch_id === branchFilter)
        && (serviceFilter === "all" || a.services.includes(serviceFilter))
        && (providerFilter === "all" || a.provider_id === providerFilter)
    ),
    [allAppointments, branchFilter, serviceFilter, providerFilter]
  );

  const dayGridAppointments = useMemo(
    () => filteredAppointments.filter(
      (a) => isSameDay(a.start, selectedDate) && dayGridProviders.some((p) => p.id === a.provider_id)
    ),
    [filteredAppointments, selectedDate, dayGridProviders]
  );

  const weekStart = startOfWeekSat(selectedDate);

  if (!can("svc.calendar.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("calendar.permission_required")}</p>
      </div>
    );
  }

  function clearFilters() {
    setProviderFilter("all");
    setServiceFilter("all");
    setBranchFilter("all");
  }

  function openHeaderNewAppointment() {
    const provider = dayGridProviders[0] ?? visibleProviders[0] ?? PROVIDERS[0];
    if (!provider) return;
    const now = new Date();
    const startMin = snapMinutes(Math.max(GRID_START_MIN, now.getHours() * 60 + now.getMinutes()));
    setNewSlot({ provider, startIso: composeIso(selectedDate, startMin) });
  }

  function handleReschedule(appt: SvcAppointment, providerId: string, startIso: string, durationMin?: number) {
    const result = rescheduleAppointment(appt.id, { provider_id: providerId, start: startIso, duration_min: durationMin });
    if (result === "conflict") toast.error(t("calendar.reschedule_conflict_toast"));
    else if (result === "warned_availability") toast.warning(t("calendar.reschedule_warned_toast"));
    else toast.success(t("calendar.reschedule_ok_toast", { time: formatTime(startIso) }));
  }

  function stepDate(dir: 1 | -1) {
    setSelectedDate((d) => addDays(d, dir * (effectiveViewMode === "week" ? 7 : 1)));
  }

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {isOffline && <OfflineBanner message={t("calendar.offline_note")} />}

      {/* Header — title · day/week toggle · date nav · new appointment */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <h1 className="text-base font-semibold text-foreground shrink-0">{t("calendar.title")}</h1>

        <Tabs value={effectiveViewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="hidden sm:block shrink-0">
          <TabsList className="h-11 p-1 bg-muted gap-1">
            <TabsTrigger value="day" className="h-9 px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <CalendarDays className="h-4 w-4" /> {t("calendar.day")}
            </TabsTrigger>
            <TabsTrigger value="week" className="h-9 px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <CalendarRange className="h-4 w-4" /> {t("calendar.week")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="icon" size="icon" className="h-9 w-9" onClick={() => stepDate(-1)} aria-label={t("calendar.prev")}>
            <ChevronRight className="h-4 w-4 rtl:hidden" />
            <ChevronLeft className="h-4 w-4 hidden rtl:block" />
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setSelectedDate(new Date())}>
            {t("calendar.today")}
          </Button>
          <Button variant="icon" size="icon" className="h-9 w-9" onClick={() => stepDate(1)} aria-label={t("calendar.next")}>
            <ChevronLeft className="h-4 w-4 rtl:hidden" />
            <ChevronRight className="h-4 w-4 hidden rtl:block" />
          </Button>
        </div>

        <span className="text-sm font-medium text-foreground tabular-nums shrink-0" dir="ltr">
          {effectiveViewMode === "day" ? formatDate(selectedDate) : `${formatDate(weekStart)} – ${formatDate(addDays(weekStart, 6))}`}
        </span>

        <span className="flex-1" />

        <Button variant="outline" size="sm" className="h-11 shrink-0" onClick={() => navigate("/svc/subscriptions")}>
          <Repeat className="h-4 w-4 me-1.5" />
          {t("calendar.subscriptions_link")}
        </Button>

        {canBook && (
          <Button variant="solid" tone="primary" size="sm" className="h-11 shrink-0" onClick={openHeaderNewAppointment}>
            <Plus className="h-4 w-4 me-1.5" />
            {t("calendar.new_appointment")}
          </Button>
        )}
      </div>

      {/* Filters — provider / service / branch */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="h-10 w-auto min-w-[9rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("calendar.filter_all_providers")}</SelectItem>
            {PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id}>{providerName(p, lang)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="h-10 w-auto min-w-[9rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("calendar.filter_all_services")}</SelectItem>
            {SERVICES.map((s) => <SelectItem key={s.id} value={s.id}>{lang === "ar" ? s.name_ar : s.name_en}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="h-10 w-auto min-w-[9rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("calendar.filter_all_branches")}</SelectItem>
            {BRANCHES.map((b) => <SelectItem key={b.id} value={b.id}>{lang === "ar" ? b.name_ar : b.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile — single-provider selector (day view only, per responsive rule) */}
      {isMobile && visibleProviders.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
          {visibleProviders.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setMobileProviderId(p.id)}
              className={cn(
                "h-9 px-3 rounded-full border text-sm font-medium whitespace-nowrap shrink-0 transition-colors",
                mobileProviderId === p.id ? "bg-brand text-on-brand border-brand" : "border-border text-foreground hover:border-brand/40"
              )}
            >
              {providerName(p, lang)}
            </button>
          ))}
        </div>
      )}

      {/* Body — five states */}
      {loading ? (
        <CalendarSkeleton />
      ) : error ? (
        <ErrorState title={t("calendar.error_title")} description={t("calendar.error_body")} onRetry={reload} />
      ) : allAppointments.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t("calendar.empty_title")}
          description={t("calendar.empty_body")}
          action={canBook ? { label: t("calendar.new_appointment"), onClick: openHeaderNewAppointment } : undefined}
        />
      ) : noResults ? (
        <EmptyState
          title={t("calendar.no_results_title")}
          description={t("calendar.no_results_body")}
          action={{ label: t("calendar.clear_filters"), onClick: clearFilters }}
        />
      ) : effectiveViewMode === "day" ? (
        <DayGrid
          day={selectedDate}
          providers={dayGridProviders}
          appointments={dayGridAppointments}
          interactive={canBook}
          lang={lang}
          dir={dir}
          onEmptySlotTap={(provider, startIso) => setNewSlot({ provider, startIso })}
          onBlockTap={setViewingAppointment}
          onReschedule={handleReschedule}
        />
      ) : (
        <WeekGrid
          weekStart={weekStart}
          today={new Date()}
          appointments={filteredAppointments}
          lang={lang}
          dir={dir}
          onDayTap={(day) => { setSelectedDate(day); setViewMode("day"); }}
          onBlockTap={setViewingAppointment}
        />
      )}

      <AppointmentDrawer
        open={!!newSlot}
        onOpenChange={(o) => !o && setNewSlot(null)}
        lang={lang}
        newSlot={newSlot}
      />
      <AppointmentDrawer
        open={!!viewingAppointment}
        onOpenChange={(o) => !o && setViewingAppointment(null)}
        lang={lang}
        appointment={viewingAppointment}
      />
    </div>
  );
}
