import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, CheckCircle2, AlertCircle, Clock, CalendarClock } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useCreateDispatcher } from "@/stores/createDispatcher";
import { useCrmData, type FollowUp } from "../data/useCrmData";

// ── Group config ──────────────────────────────────────────────────

const GROUPS = [
  { key: "overdue",   icon: AlertCircle,   className: "text-danger" },
  { key: "due_today", icon: Clock,          className: "text-warning" },
  { key: "upcoming",  icon: CalendarClock,  className: "text-blue-500" },
] as const;

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
  const openCreate = useCreateDispatcher(s => s.openCreate);

  const [doneIds, setDoneIds]   = useState<Set<string>>(() => new Set());

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
          count={totalOpen > 0 ? t("follow_ups.count", { n: totalOpen }) : undefined}
          actions={
            can("crm.followup.create") ? (
              <Button size="sm" onClick={() => openCreate("new_follow_up")}>
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
                ? { label: t("follow_ups.new"), onClick: () => openCreate("new_follow_up") }
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
    </>
  );
}
