import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Calendar, Pause, Play, Mail, MessageCircle } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { StatusPill }    from "@/components/patterns/StatusPill";

import { ModalShell }  from "@/components/patterns/ModalShell";
import { TimePicker }  from "@/components/patterns/TimePicker";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { formatDate } from "@/lib/format";
import { useCan }     from "@/lib/permissions";
import { useReportsData, type Schedule } from "../data/useReportsData";

// ── Channel icon ──────────────────────────────────────────────────

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "whatsapp") return <MessageCircle className="h-3.5 w-3.5 text-[#25d366]" />;
  return <Mail className="h-3.5 w-3.5 text-muted-foreground" />;
}

// ── New schedule dialog ───────────────────────────────────────────

function NewScheduleDialog({
  open, onClose, lang, t,
}: {
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"reports">>["t"];
}) {
  const [name, setName]       = useState("");
  const [target, setTarget]   = useState("");
  const [cadence, setCadence] = useState<string>("");
  const [time, setTime]       = useState("08:00");
  const [channel, setChannel] = useState<string>("");

  function handleSave() {
    onClose();
    setName(""); setTarget(""); setCadence(""); setTime("08:00"); setChannel("");
    toast.success(t("scheduling.saved_toast"));
  }

  const valid = name.trim() && target.trim() && cadence && channel;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("scheduling.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!valid} onClick={handleSave}>
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("scheduling.form_name")} *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("scheduling.form_target")} *</Label>
          <Input value={target} onChange={e => setTarget(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("scheduling.form_cadence")} *</Label>
            <Select value={cadence} onValueChange={setCadence}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("scheduling.cadence_daily")}</SelectItem>
                <SelectItem value="weekly">{t("scheduling.cadence_weekly")}</SelectItem>
                <SelectItem value="monthly">{t("scheduling.cadence_monthly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("scheduling.form_time")}</Label>
            <TimePicker value={time} onChange={setTime} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("scheduling.form_channel")} *</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">{t("scheduling.channel_whatsapp")}</SelectItem>
              <SelectItem value="email">{t("scheduling.channel_email")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Schedule card ─────────────────────────────────────────────────

function ScheduleCard({
  s, paused, onToggle, lang, t,
}: {
  s: Schedule;
  paused: boolean;
  onToggle: (id: string) => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"reports">>["t"];
}) {
  const effective = paused ? "paused" : s.status;

  return (
    <div className="rounded-sm bg-card shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <p className="font-semibold text-sm truncate">{s.name_ar}</p>
          <p className="text-xs text-muted-foreground truncate">{s.target}</p>
        </div>
        <StatusPill
          variant={effective === "active" ? "approved" : "pending"}
          label={t(effective === "active" ? "scheduling.status_active" : "scheduling.status_paused")}
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{t(`scheduling.cadence_${s.cadence}` as Parameters<typeof t>[0])} — {s.time}</span>
        <div className="flex items-center gap-1">
          <ChannelIcon channel={s.channel} />
          {t(`scheduling.channel_${s.channel}` as Parameters<typeof t>[0])}
        </div>
        <span>
          {t("scheduling.last_sent")}: {s.last_sent ? formatDate(s.last_sent) : t("scheduling.never_sent")}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {s.recipients.map(r => (
            <span key={r} className="text-[10px] bg-muted rounded px-1.5 py-0.5 font-mono text-muted-foreground">
              {r}
            </span>
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1 text-muted-foreground"
          onClick={() => onToggle(s.id)}
        >
          {effective === "active"
            ? <><Pause className="h-3 w-3" />{t("scheduling.pause_btn")}</>
            : <><Play  className="h-3 w-3" />{t("scheduling.resume_btn")}</>
          }
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function SchedulingPage() {
  const { t, i18n } = useTranslation("reports");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useReportsData();

  const [paused, setPaused]       = useState<Set<string>>(() => new Set());
  const [newOpen, setNewOpen]     = useState(false);

  const schedules = data?.schedules ?? [];

  function handleToggle(id: string) {
    setPaused(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    toast.success(t("scheduling.toggled_toast"));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("scheduling.title")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded border border-border p-4 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-56" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("scheduling.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("scheduling.title")}
          count={t("scheduling.count", { n: schedules.length })}
          actions={
            can("reports.schedules.create") ? (
              <Button size="sm" onClick={() => setNewOpen(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("scheduling.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        {schedules.length === 0 ? (
          <PageSection>
            <EmptyState
              icon={Calendar}
              title={t("scheduling.no_schedules")}
              description={t("scheduling.empty_sub")}
              action={can("reports.schedules.create")
                ? { label: t("scheduling.new"), onClick: () => setNewOpen(true) }
                : undefined}
            />
          </PageSection>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {schedules.map(s => (
              <ScheduleCard
                key={s.id}
                s={s}
                paused={paused.has(s.id) ? s.status === "active" : s.status === "paused"}
                onToggle={handleToggle}
                lang={lang}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      <NewScheduleDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        lang={lang}
        t={t}
      />
    </>
  );
}
