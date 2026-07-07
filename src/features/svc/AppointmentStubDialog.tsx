import { useTranslation } from "react-i18next";
import { CalendarPlus, Info } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/patterns/StatusPill";
import { formatDate, formatTime } from "@/lib/format";
import type { Lang } from "@/stores/appearance";
import type { SvcAppointment } from "@/stores/svcAppointments";
import type { SvcProvider } from "./catalog";
import { clientName, findClient, providerName, servicesLabel } from "./catalog";
import { APPOINTMENT_STATUS_PILL } from "./appointmentStatus";

interface NewSlot {
  provider: SvcProvider;
  startIso: string;
}

interface AppointmentStubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  /** Exactly one of these is set — "new" (empty-slot tap / header action) or "view" (tap an existing block). Both render the same stub body; Step 2 replaces this with the real booking form / lifecycle drawer. */
  newSlot?: NewSlot | null;
  appointment?: SvcAppointment | null;
}

/** Stub overlay for FE_11 Step 1 — Step 2 builds the real "New appointment" form + `/svc/appointment/:id` lifecycle drawer. This just proves the calendar hands off the right slot/appointment context. */
export function AppointmentStubDialog({ open, onOpenChange, lang, newSlot, appointment }: AppointmentStubDialogProps) {
  const { t } = useTranslation("svc");

  const isNew = !!newSlot;
  const title = isNew ? t("calendar.new_appointment") : t("calendar.appointment_details");

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={<Button variant="solid" tone="primary" onClick={() => onOpenChange(false)}>{t("calendar.stub_close")}</Button>}
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="flex items-center justify-center h-12 w-12 rounded-full bg-brand-tint text-brand-text">
          {isNew ? <CalendarPlus className="h-6 w-6" /> : <Info className="h-6 w-6" />}
        </span>

        {isNew && newSlot && (
          <div className="w-full rounded-lg border border-border p-3 space-y-1.5 text-start">
            <p className="text-sm font-semibold text-foreground">{providerName(newSlot.provider, lang)}</p>
            <p className="text-sm text-muted-foreground tabular-nums" dir="ltr">
              {formatDate(newSlot.startIso)} · {formatTime(newSlot.startIso)}
            </p>
          </div>
        )}

        {!isNew && appointment && (
          <div className="w-full rounded-lg border border-border p-3 space-y-1.5 text-start">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{clientName(findClient(appointment.client_id), lang)}</p>
              <StatusPill variant={APPOINTMENT_STATUS_PILL[appointment.status]} label={t(`calendar.status.${appointment.status}`)} />
            </div>
            <p className="text-sm text-muted-foreground">{servicesLabel(appointment.services, lang)}</p>
            <p className="text-sm text-muted-foreground tabular-nums" dir="ltr">
              {formatDate(appointment.start)} · {formatTime(appointment.start)}
            </p>
            <p className="text-xs text-muted-foreground">{appointment.number}</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">{t("calendar.stub_note")}</p>
      </div>
    </ModalShell>
  );
}
