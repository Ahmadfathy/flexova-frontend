import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, CheckCircle2, AlertCircle, Clock, CalendarClock, Loader2 } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Badge }   from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useCrmData, type FollowUp } from "../data/useCrmData";

// ── Group config ──────────────────────────────────────────────────

const GROUPS = [
  { key: "overdue",   icon: AlertCircle,   className: "text-danger" },
  { key: "due_today", icon: Clock,          className: "text-warning" },
  { key: "upcoming",  icon: CalendarClock,  className: "text-blue-500" },
] as const;

// ── Create dialog ─────────────────────────────────────────────────

function CreateDialog({
  customers, open, onClose, lang, t,
}: {
  customers: { id: string; name_ar: string; name_en: string }[];
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"crm">>["t"];
}) {
  const [customerId, setCust] = useState("");
  const [note, setNote]       = useState("");
  const [due, setDue]         = useState("");
  const [owner, setOwner]     = useState("");
  const [saving, setSaving]   = useState(false);

  const isValid = customerId && note.trim() && due;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("follow_ups.saved_toast"));
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("follow_ups.form_title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("follow_ups.form_customer")} *</Label>
            <Select value={customerId} onValueChange={setCust}>
              <SelectTrigger>
                <SelectValue placeholder={t("follow_ups.form_customer_ph")} />
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {lang === "ar" ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("follow_ups.form_note")} *</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("follow_ups.form_due")} *</Label>
            <Input type="date" value={due} onChange={e => setDue(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("follow_ups.form_owner")}</Label>
            <Input value={owner} onChange={e => setOwner(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!isValid || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Follow-up row ─────────────────────────────────────────────────

function FollowUpRow({
  item, customerName, onDone, t,
}: {
  item: FollowUp;
  customerName: string;
  onDone: (id: string) => void;
  t: ReturnType<typeof useTranslation<"crm">>["t"];
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 border-b border-border last:border-0">
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium truncate">{customerName}</p>
        <p className="text-sm text-muted-foreground">{item.note}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span>{t("follow_ups.col_due")}: <span className="tabular-nums">{formatDate(item.due)}</span></span>
          {item.owner && <span>{t("follow_ups.col_owner")}: {item.owner}</span>}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 text-xs h-7 gap-1"
        onClick={() => onDone(item.id)}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("follow_ups.action_done")}
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function FollowUpsPage() {
  const { t, i18n } = useTranslation("crm");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useCrmData();

  const [doneIds, setDoneIds]   = useState<Set<string>>(() => new Set());
  const [createOpen, setCreate] = useState(false);

  const openFollowUps = useMemo(
    () => (data?.followUps ?? []).filter(f => f.status === "open" && !doneIds.has(f.id)),
    [data?.followUps, doneIds],
  );

  const totalOpen = openFollowUps.length;

  const handleDone = useCallback((id: string) => {
    setDoneIds(prev => new Set([...prev, id]));
    toast.success(t("follow_ups.done_toast"));
  }, [t]);

  const customers = useMemo(
    () => (data?.customers ?? []).filter(c => !c.is_walkin),
    [data?.customers],
  );

  function customerName(id: string) {
    const c = customers.find(cu => cu.id === id);
    if (!c) return id;
    return lang === "ar" ? c.name_ar : c.name_en;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("follow_ups.title")} />
        {GROUPS.map(g => (
          <PageSection key={g.key} padded={false}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-7 w-20 rounded" />
              </div>
            ))}
          </PageSection>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("follow_ups.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("follow_ups.title")}
          subtitle={totalOpen > 0 ? t("follow_ups.count", { n: totalOpen }) : undefined}
          actions={
            can("crm.followup.create") ? (
              <Button size="sm" onClick={() => setCreate(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("follow_ups.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        {totalOpen === 0 ? (
          <PageSection>
            <EmptyState
              icon={CheckCircle2}
              title={t("follow_ups.no_followups")}
              description={t("follow_ups.empty_sub")}
              action={can("crm.followup.create")
                ? { label: t("follow_ups.new"), onClick: () => setCreate(true) }
                : undefined}
            />
          </PageSection>
        ) : (
          GROUPS.map(g => {
            const items = openFollowUps.filter(f => f.group === g.key);
            if (items.length === 0) return null;
            const Icon = g.icon;
            return (
              <PageSection
                key={g.key}
                title={
                  <span className={cn("flex items-center gap-1.5", g.className)}>
                    <Icon className="h-4 w-4" />
                    {t(`follow_ups.group_${g.key === "due_today" ? "today" : g.key}` as Parameters<typeof t>[0])}
                    <Badge variant="secondary" className="ms-1 text-xs">{items.length}</Badge>
                  </span>
                }
                padded={false}
              >
                {items.map(item => (
                  <FollowUpRow
                    key={item.id}
                    item={item}
                    customerName={customerName(item.customer_id)}
                    onDone={handleDone}
                    t={t}
                  />
                ))}
              </PageSection>
            );
          })
        )}
      </div>

      <CreateDialog
        customers={customers}
        open={createOpen}
        onClose={() => setCreate(false)}
        lang={lang}
        t={t}
      />
    </>
  );
}
