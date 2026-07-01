import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Wallet } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { EntityCell }    from "@/components/patterns/DataTable";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DrawerShell } from "@/components/patterns/DrawerShell";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useCreateDispatcher } from "@/stores/createDispatcher";
import { useHrData, type Advance } from "../data/useHrData";

// ── Advance detail sheet ──────────────────────────────────────────

function AdvanceSheet({
  adv, empName, open, onClose, lang, t,
}: {
  adv: Advance | null;
  empName: string;
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"hr">>["t"];
}) {
  const pct = adv && adv.amount > 0 ? Math.round(((adv.amount - adv.remaining) / adv.amount) * 100) : 0;

  return (
    <DrawerShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={adv ? (
        <>
          <Badge variant="outline" className="text-xs mb-1">
            {t(adv.type === "advance" ? "advances.type_advance" : "advances.type_loan")}
          </Badge>
          <div>{empName}</div>
        </>
      ) : ""}
      description={adv ? formatDate(adv.granted) : undefined}
      size="sm"
    >
      {adv && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">{t("advances.col_amount")}</p>
              <p className="text-lg font-bold tabular-nums">{formatMoney(adv.amount, lang)}</p>
            </div>
            <div className="rounded border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">{t("advances.col_remaining")}</p>
              <p className={cn("text-lg font-bold tabular-nums", adv.remaining > 0 ? "text-danger" : "text-success")}>
                {formatMoney(adv.remaining, lang)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-success rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pct}% {lang === "ar" ? "مسدد" : "repaid"}</p>
          </div>

          {/* Schedule */}
          {adv.schedule.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("advances.schedule_title")}</p>
              <div className="space-y-1.5">
                {adv.schedule.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground tabular-nums" dir="ltr">{s.period}</span>
                    <span className="tabular-nums font-medium">{formatMoney(s.amount, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DrawerShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function AdvancesPage() {
  const { t, i18n } = useTranslation("hr");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useHrData();
  const openCreate = useCreateDispatcher(s => s.openCreate);

  const [typeFilter, setTypeFilter]   = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [selected, setSelected]       = useState<Advance | null>(null);

  const advances   = data?.advances  ?? [];
  const employees  = data?.employees ?? [];

  const filtered = useMemo(() => {
    let list = advances;
    if (typeFilter)   list = list.filter(a => a.type === typeFilter);
    if (statusFilter) list = list.filter(a => a.status === statusFilter);
    return list;
  }, [advances, typeFilter, statusFilter]);

  function empName(id: string) {
    const e = employees.find(emp => emp.id === id);
    if (!e) return id;
    return lang === "ar" ? e.name_ar : e.name_en;
  }

  const selectedName = selected ? empName(selected.employee_id) : "";

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("advances.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3.5 w-28 flex-1" />
              <Skeleton className="h-3.5 w-20 tabular-nums" />
              <Skeleton className="h-3.5 w-20 tabular-nums" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("advances.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("advances.title")}
          count={t("advances.count", { n: advances.length })}
          actions={
            can("hr.advance.create") ? (
              <Button size="sm" onClick={() => openCreate("new_advance")}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("advances.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        <PageSection padded={false}>

          {/* Toolbar — type + status filters; lives inside the card, above the table */}
          <div className="px-6 py-6 border-b border-border flex flex-wrap gap-2">
            <Select value={typeFilter || "__all__"} onValueChange={v => setTypeFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-10 w-auto min-w-32">
                <SelectValue placeholder={t("advances.all_types")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("advances.all_types")}</SelectItem>
                <SelectItem value="advance">{t("advances.type_advance")}</SelectItem>
                <SelectItem value="loan">{t("advances.type_loan")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter || "__all__"} onValueChange={v => setStatus(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-10 w-auto min-w-36">
                <SelectValue placeholder={t("advances.all_statuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("advances.all_statuses")}</SelectItem>
                <SelectItem value="outstanding">{t("advances.status_outstanding")}</SelectItem>
                <SelectItem value="settled">{t("advances.status_settled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {advances.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={t("advances.no_advances")}
              description={t("advances.empty_sub")}
              action={can("hr.advance.create")
                ? { label: t("advances.new"), onClick: () => openCreate("new_advance") }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("advances.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setTypeFilter(""); setStatus(""); }}>
                {t("advances.clear_filters")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {["col_employee","col_type","col_granted","col_amount","col_remaining","col_status"].map(k => (
                      <TableHead key={k} className={cn(
                        "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      )}>
                        {t(`advances.${k}` as Parameters<typeof t>[0])}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(adv => {
                    const name = empName(adv.employee_id);
                    return (
                      <TableRow
                        key={adv.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelected(adv)}
                      >
                        <TableCell>
                          <EntityCell name={name} avatarFallback={name.slice(0, 2)} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {t(adv.type === "advance" ? "advances.type_advance" : "advances.type_loan")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {formatDate(adv.granted)}
                        </TableCell>
                        <TableCell className="text-start tabular-nums text-sm font-medium">
                          {formatMoney(adv.amount, lang)}
                        </TableCell>
                        <TableCell className="text-start tabular-nums text-sm">
                          <span className={cn(adv.remaining > 0 ? "text-danger font-medium" : "text-success")}>
                            {formatMoney(adv.remaining, lang)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            variant={adv.status === "outstanding" ? "warning" : "success"}
                            label={t(adv.status === "outstanding" ? "advances.status_outstanding" : "advances.status_settled")}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </PageSection>
      </div>

      <AdvanceSheet adv={selected} empName={selectedName} open={selected !== null} onClose={() => setSelected(null)} lang={lang} t={t} />
    </>
  );
}
