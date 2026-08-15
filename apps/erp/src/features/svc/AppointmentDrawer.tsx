import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Ticket } from "lucide-react";
import { DrawerShell } from "@/components/patterns/DrawerShell";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { StatusPill } from "@/components/patterns/StatusPill";
import { FormField } from "@/components/patterns/FormLayout";
import { DatePicker } from "@/components/patterns/DatePicker";
import { TimePicker } from "@/components/patterns/TimePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useCan } from "@/lib/permissions";
import type { Lang } from "@/stores/appearance";
import { useSvcAppointments, type SvcAppointment, type AppointmentStatus } from "@/stores/svcAppointments";
import { useSvcPackages } from "@/stores/svcPackages";
import {
  CANCELLATION_FEE_EGP, DEFAULT_BRANCH_ID, SERVICES,
  clientName, eligibleProviders, findClient, findProvider, providerName, servicesDuration, servicesPrice,
} from "./catalog";
import type { SvcProvider } from "./catalog";
import { findConflict, isWithinAvailability } from "./scheduling";
import { findCoveragePackage } from "./packages";
import { APPOINTMENT_STATUS_PILL } from "./appointmentStatus";
import { ClientPicker } from "./ClientPicker";

interface NewSlot { provider: SvcProvider; startIso: string }

interface AppointmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  newSlot?: NewSlot | null;
  appointment?: SvcAppointment | null;
}

/** booked→confirmed→checked-in→in-service→completed — the one-step-forward lifecycle button target. */
const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  booked: "confirmed",
  confirmed: "checked-in",
  "checked-in": "in-service",
  "in-service": "completed",
};

const TERMINAL_STATUSES: AppointmentStatus[] = ["completed", "cancelled", "no-show"];

export function AppointmentDrawer({ open, onOpenChange, lang, newSlot, appointment }: AppointmentDrawerProps) {
  const { t } = useTranslation("svc");
  const navigate = useNavigate();
  const can = useCan();

  const appointments = useSvcAppointments((s) => s.appointments);
  const bookAppointment = useSvcAppointments((s) => s.bookAppointment);
  const updateAppointment = useSvcAppointments((s) => s.updateAppointment);
  const setLifecycleStatus = useSvcAppointments((s) => s.setLifecycleStatus);
  const completeAppointment = useSvcAppointments((s) => s.completeAppointment);
  const cancelAppointment = useSvcAppointments((s) => s.cancelAppointment);
  const markNoShow = useSvcAppointments((s) => s.markNoShow);

  const packages = useSvcPackages((s) => s.packages);
  const useSession = useSvcPackages((s) => s.useSession);

  const isNew = !!newSlot;
  const live = appointment ? appointments[appointment.id] ?? appointment : null;

  const [clientMode, setClientMode] = useState<"crm" | "walkin">("crm");
  const [clientId, setClientId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [providerId, setProviderId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [notes, setNotes] = useState("");
  const [coverWithPackage, setCoverWithPackage] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const [exitAction, setExitAction] = useState<"cancel" | "no-show" | null>(null);
  const [exitReason, setExitReason] = useState("");
  const [exitFee, setExitFee] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (live) {
      setClientMode(live.client_id ? "crm" : "walkin");
      setClientId(live.client_id ?? "");
      setWalkInName(live.walk_in_name ?? "");
      setServiceIds(live.services);
      setProviderId(live.provider_id);
      setDateStr(live.start.slice(0, 10));
      setTimeStr(live.start.slice(11, 16));
      setNotes(live.notes ?? "");
      setCoverWithPackage(live.package_covered);
    } else if (newSlot) {
      setClientMode("crm");
      setClientId("");
      setWalkInName("");
      setServiceIds([]);
      setProviderId(newSlot.provider.id);
      setDateStr(newSlot.startIso.slice(0, 10));
      setTimeStr(newSlot.startIso.slice(11, 16));
      setNotes("");
      setCoverWithPackage(false);
    }
    setExitAction(null);
    setExitReason("");
    setExitFee(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, live, newSlot]);

  const startIso = dateStr && timeStr ? `${dateStr}T${timeStr}:00` : "";
  const durationMin = servicesDuration(serviceIds);
  const totalPrice = servicesPrice(serviceIds);
  const eligible = useMemo(() => eligibleProviders(serviceIds), [serviceIds]);
  const provider = findProvider(providerId);

  useEffect(() => {
    if (providerId && !eligible.some((p) => p.id === providerId)) setProviderId("");
  }, [eligible, providerId]);

  const coveragePackage = clientMode === "crm" ? findCoveragePackage(packages, clientId, serviceIds) : undefined;

  useEffect(() => {
    if (!coveragePackage) setCoverWithPackage(false);
  }, [coveragePackage]);

  const conflict = useMemo(() => {
    if (!startIso || !providerId || durationMin === 0) return null;
    return findConflict(Object.values(appointments), providerId, startIso, durationMin, live?.id);
  }, [appointments, startIso, providerId, durationMin, live?.id]);

  const availabilityWarning = useMemo(() => {
    if (!startIso || !provider || durationMin === 0) return false;
    return !isWithinAvailability(provider, startIso, durationMin);
  }, [provider, startIso, durationMin]);

  const isTerminal = live ? TERMINAL_STATUSES.includes(live.status) : false;
  const canEdit = !isTerminal;

  const isValid =
    (clientMode === "crm" ? !!clientId : walkInName.trim().length > 0) &&
    serviceIds.length > 0 &&
    !!providerId &&
    !!startIso &&
    !conflict;

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function buildInput() {
    return {
      client_id: clientMode === "crm" ? clientId : "",
      walk_in_name: clientMode === "walkin" ? walkInName.trim() : undefined,
      provider_id: providerId,
      services: serviceIds,
      start: startIso,
      duration_min: durationMin,
      notes: notes.trim() || undefined,
      package_covered: !!coveragePackage && coverWithPackage,
      package_id: coveragePackage && coverWithPackage ? coveragePackage.id : undefined,
    };
  }

  function handleSave() {
    if (!isValid) return;
    if (isNew) {
      const { result } = bookAppointment({ ...buildInput(), branch_id: DEFAULT_BRANCH_ID, source: "cashier" });
      if (result === "conflict") { toast.error(t("appointment.conflict_toast")); return; }
      if (result === "warned_availability") toast.warning(t("appointment.availability_warning_toast"));
      toast.success(t("appointment.booked_toast"));
      onOpenChange(false);
      return;
    }
    if (!live) return;
    const result = updateAppointment(live.id, buildInput());
    if (result === "conflict") { toast.error(t("appointment.conflict_toast")); return; }
    if (result === "warned_availability") toast.warning(t("appointment.availability_warning_toast"));
    else toast.success(t("appointment.saved_toast"));
  }

  function handleAdvance() {
    if (!live) return;
    const next = NEXT_STATUS[live.status];
    if (!next) return;

    if (next === "completed") {
      if (coveragePackage && coverWithPackage) {
        const ok = useSession(coveragePackage.id);
        if (!ok) { toast.error(t("appointment.package_empty_toast")); return; }
      }
      const ticketId = completeAppointment(live.id);
      onOpenChange(false);
      if (ticketId) navigate(`/svc/ticket/${ticketId}`);
      return;
    }

    setLifecycleStatus(live.id, next);
    toast.success(t(`appointment.status_toast.${next}`));
  }

  function confirmExit() {
    if (!live || !exitAction || !exitReason.trim()) return;
    const fee = exitFee ? CANCELLATION_FEE_EGP : 0;
    if (exitAction === "cancel") cancelAppointment(live.id, exitReason.trim(), fee);
    else markNoShow(live.id, exitReason.trim(), fee);
    toast.success(exitAction === "cancel" ? t("appointment.cancelled_toast") : t("appointment.no_show_toast"));
    setExitAction(null);
    onOpenChange(false);
  }

  const canBook = can("svc.appointment.book");
  const canEditPerm = can("svc.appointment.edit");
  const canCancelPerm = can("svc.appointment.cancel");
  const nextStatus = live ? NEXT_STATUS[live.status] : undefined;
  const title = isNew ? t("appointment.new_title") : live?.number ?? t("appointment.title");

  return (
    <>
      <DrawerShell
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {!isNew && live && !isTerminal && canCancelPerm && (
                <>
                  {(live.status === "booked" || live.status === "confirmed") && (
                    <Button
                      variant="outline" tone="warning"
                      onClick={() => { setExitAction("no-show"); setExitReason(""); setExitFee(false); }}
                    >
                      {t("appointment.no_show_action")}
                    </Button>
                  )}
                  <Button
                    variant="outline" tone="danger"
                    onClick={() => { setExitAction("cancel"); setExitReason(""); setExitFee(false); }}
                  >
                    {t("appointment.cancel_action")}
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("appointment.close")}</Button>
              {!isTerminal && (isNew ? canBook : canEditPerm) && (
                <Button variant="solid" tone="primary" disabled={!isValid} onClick={handleSave}>
                  {isNew ? t("appointment.book_action") : t("appointment.save_action")}
                </Button>
              )}
              {!isNew && live && !isTerminal && nextStatus && canEditPerm && (
                <Button variant="solid" tone="success" onClick={handleAdvance}>
                  {t(`appointment.advance_action.${nextStatus}`)}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {!isNew && live && (
            <div className="flex items-center justify-between gap-2">
              <StatusPill variant={APPOINTMENT_STATUS_PILL[live.status]} label={t(`calendar.status.${live.status}`)} />
              {live.ticket_id && (
                <Button variant="link" size="sm" onClick={() => navigate(`/svc/ticket/${live.ticket_id}`)}>
                  <Ticket className="h-3.5 w-3.5 me-1" /> {t("appointment.view_ticket")}
                </Button>
              )}
            </div>
          )}

          {!isNew && live?.reason && isTerminal && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t("appointment.reason_label")}: </span>
              {live.reason}
              {!!live.cancellation_fee && (
                <span className="block mt-1 tabular-nums">
                  {t("appointment.fee_applied", { amount: formatMoney(live.cancellation_fee, lang) })}
                </span>
              )}
            </div>
          )}

          {canEdit && (conflict || availabilityWarning) && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg border p-3 text-sm",
                conflict
                  ? "border-danger bg-danger-tint text-danger-text"
                  : "border-warning bg-warning-tint text-warning-text"
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{conflict ? t("appointment.conflict_inline") : t("appointment.availability_warning_inline")}</span>
            </div>
          )}

          <FormField label={t("appointment.client_label")} required>
            {canEdit ? (
              <Button variant="outline" className="w-full justify-start h-11" onClick={() => setClientPickerOpen(true)}>
                {clientMode === "crm" && clientId
                  ? clientName(findClient(clientId), lang)
                  : clientMode === "walkin" && walkInName
                    ? `${walkInName} (${t("appointment.walk_in_badge")})`
                    : t("appointment.client_placeholder")}
              </Button>
            ) : (
              <p className="text-sm text-foreground">
                {clientMode === "crm" ? clientName(findClient(clientId), lang) : `${walkInName} (${t("appointment.walk_in_badge")})`}
              </p>
            )}
            {clientMode === "walkin" && canEdit && (
              <Input
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder={t("appointment.walk_in_name_placeholder")}
                className="mt-2 h-11"
              />
            )}
          </FormField>

          <FormField
            label={t("appointment.services_label")}
            required
            helper={serviceIds.length ? `${durationMin} ${t("appointment.minutes_suffix")} · ${formatMoney(totalPrice, lang)}` : undefined}
          >
            <div className="space-y-1.5">
              {SERVICES.map((svc) => {
                const checked = serviceIds.includes(svc.id);
                return (
                  <label
                    key={svc.id}
                    htmlFor={`svc-${svc.id}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded border-2 px-3 h-11 transition-colors",
                      canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                      checked ? "border-brand bg-brand-tint text-brand-text" : "border-border hover:border-foreground/30"
                    )}
                  >
                    <Checkbox
                      id={`svc-${svc.id}`}
                      checked={checked}
                      disabled={!canEdit}
                      onCheckedChange={() => toggleService(svc.id)}
                      className="shrink-0"
                    />
                    <span className="flex-1 min-w-0 text-sm font-medium truncate">
                      {lang === "ar" ? svc.name_ar : svc.name_en}
                    </span>
                    <span className="text-xs tabular-nums shrink-0 text-muted-foreground">
                      {svc.duration_min}{t("appointment.minutes_short")} · {formatMoney(svc.price, lang)}
                    </span>
                  </label>
                );
              })}
            </div>
          </FormField>

          <FormField
            label={t("appointment.provider_label")}
            required
            error={serviceIds.length > 0 && eligible.length === 0 ? t("appointment.no_provider_error") : undefined}
          >
            <Select value={providerId} onValueChange={setProviderId} disabled={!canEdit || eligible.length === 0}>
              <SelectTrigger className="h-11"><SelectValue placeholder={t("appointment.provider_placeholder")} /></SelectTrigger>
              <SelectContent>
                {eligible.map((p) => <SelectItem key={p.id} value={p.id}>{providerName(p, lang)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("appointment.date_label")} required>
              <DatePicker value={dateStr} onChange={setDateStr} disabled={!canEdit} />
            </FormField>
            <FormField label={t("appointment.time_label")} required>
              <TimePicker value={timeStr} onChange={setTimeStr} disabled={!canEdit} />
            </FormField>
          </div>

          {coveragePackage && (
            <label
              htmlFor="pkg-coverage"
              className={cn(
                "flex items-center gap-2.5 rounded-lg border p-3",
                canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                coverWithPackage ? "border-brand bg-brand-tint" : "border-border"
              )}
            >
              <Checkbox
                id="pkg-coverage"
                checked={coverWithPackage}
                disabled={!canEdit}
                onCheckedChange={(v) => setCoverWithPackage(!!v)}
              />
              <span className="flex-1 text-sm">
                <span className="font-medium text-foreground block">{t("appointment.coverage_label")}</span>
                <span className="text-xs text-muted-foreground">
                  {lang === "ar" ? coveragePackage.name_ar : coveragePackage.name_en}
                  {" · "}
                  {t("appointment.remaining_sessions", { n: coveragePackage.remaining })}
                </span>
              </span>
            </label>
          )}

          <FormField label={t("appointment.notes_label")}>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canEdit} rows={3} />
          </FormField>
        </div>
      </DrawerShell>

      <ClientPicker
        open={clientPickerOpen}
        onOpenChange={setClientPickerOpen}
        lang={lang}
        onPickClient={(id) => { setClientMode("crm"); setClientId(id); }}
        onPickWalkIn={() => { setClientMode("walkin"); setClientId(""); }}
      />

      <ConfirmDialog
        open={!!exitAction}
        onOpenChange={(o) => !o && setExitAction(null)}
        title={exitAction === "cancel" ? t("appointment.cancel_title") : t("appointment.no_show_title")}
        confirmTone="danger"
        confirmLabel={exitAction === "cancel" ? t("appointment.cancel_action") : t("appointment.no_show_action")}
        confirmDisabled={!exitReason.trim()}
        onConfirm={confirmExit}
      >
        <div className="space-y-3">
          <FormField label={t("appointment.cancel_reason_label")} required>
            <Textarea value={exitReason} onChange={(e) => setExitReason(e.target.value)} rows={2} autoFocus />
          </FormField>
          <label htmlFor="exit-fee" className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox id="exit-fee" checked={exitFee} onCheckedChange={(v) => setExitFee(!!v)} />
            <span className="text-sm text-foreground">
              {t("appointment.apply_fee", { amount: formatMoney(CANCELLATION_FEE_EGP, lang) })}
            </span>
          </label>
        </div>
      </ConfirmDialog>
    </>
  );
}
