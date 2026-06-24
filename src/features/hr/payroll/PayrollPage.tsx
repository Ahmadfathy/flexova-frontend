import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, AlertTriangle, CheckCircle2, Loader2, FileText } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DrawerShell } from "@/components/patterns/DrawerShell";
import { ModalShell }  from "@/components/patterns/ModalShell";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useHrData, type PayrollRun } from "../data/useHrData";

// ── Payroll detail sheet ──────────────────────────────────────────

function PayrollSheet({
  run, employees, open, onClose, onPost, lang, t,
}: {
  run: PayrollRun | null;
  employees: ReturnType<typeof useHrData>["data"] extends null ? [] : NonNullable<ReturnType<typeof useHrData>["data"]>["employees"];
  open: boolean;
  onClose: () => void;
  onPost: (id: string) => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"hr">>["t"];
}) {
  function empName(id: string) {
    const e = (employees as any[]).find((emp: any) => emp.id === id);
    if (!e) return id;
    return lang === "ar" ? e.name_ar : e.name_en;
  }

  const totalGross      = run?.lines.reduce((s, l) => s + l.gross, 0) ?? 0;
  const totalDeductions = run?.lines.reduce((s, l) => s + l.deductions, 0) ?? 0;
  const totalNet        = run?.lines.reduce((s, l) => s + l.net, 0) ?? 0;

  return (
    <DrawerShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={run ? (
        <div className="flex items-center justify-between gap-2 w-full">
          <div>
            <p className="font-mono text-sm text-muted-foreground">{run.number}</p>
            <p className="text-base font-semibold" dir="ltr">{run.period}</p>
          </div>
          <StatusPill
            variant={run.status === "posted" ? "approved" : "pending"}
            label={t(run.status === "posted" ? "payroll.status_posted" : "payroll.status_draft")}
          />
        </div>
      ) : ""}
      size="lg"
    >
      {run && (
        <div className="space-y-5">
          {/* Warnings */}
          {(run.warnings ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("payroll.warnings_title")}</p>
              {run.warnings!.map((w, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {lang === "ar" ? w.text_ar : w.text_en}
                </div>
              ))}
            </div>
          )}

          {/* Payroll lines */}
          {run.lines.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("payroll.lines_title")}</p>
              <div className="overflow-x-auto rounded-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      {["lines_employee","lines_gross","lines_deductions","lines_net"].map(k => (
                        <TableHead key={k} className={cn(
                          "text-xs font-semibold uppercase text-muted-foreground py-2",
                          k !== "lines_employee" && "text-end",
                        )}>
                          {t(`payroll.${k}` as Parameters<typeof t>[0])}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.lines.map(line => (
                      <TableRow key={line.employee_id} className="border-b border-border last:border-0">
                        <TableCell className="text-sm">{empName(line.employee_id)}</TableCell>
                        <TableCell className="text-end tabular-nums text-sm">{formatMoney(line.gross, lang)}</TableCell>
                        <TableCell className="text-end tabular-nums text-sm">
                          {line.deductions > 0
                            ? <span className="text-danger">-{formatMoney(line.deductions, lang)}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-end tabular-nums text-sm font-medium">{formatMoney(line.net, lang)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell className="text-xs">{lang === "ar" ? "الإجمالي" : "Total"}</TableCell>
                      <TableCell className="text-end tabular-nums text-xs">{formatMoney(totalGross, lang)}</TableCell>
                      <TableCell className="text-end tabular-nums text-xs text-danger">
                        {totalDeductions > 0 ? `-${formatMoney(totalDeductions, lang)}` : "—"}
                      </TableCell>
                      <TableCell className="text-end tabular-nums text-xs">{formatMoney(totalNet, lang)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          )}

          {/* Journal entry */}
          {run.posting_entry && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t("payroll.posting_title")}</p>
                <div className="space-y-1.5">
                  {run.posting_entry.lines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{l.name_ar}</span>
                      <div className="flex gap-4 tabular-nums">
                        <span className={cn(l.dr > 0 ? "font-medium" : "text-muted-foreground")}>
                          {l.dr > 0 ? formatMoney(l.dr, lang) : "—"}
                        </span>
                        <span className={cn(l.cr > 0 ? "font-medium text-danger" : "text-muted-foreground")}>
                          {l.cr > 0 ? formatMoney(l.cr, lang) : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {run.posting_entry.balanced && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {lang === "ar" ? "قيد متوازن" : "Balanced entry"}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Post action */}
          {run.status === "draft" && (
            <Button className="w-full" onClick={() => onPost(run.id)}>
              {t("payroll.post_btn")}
            </Button>
          )}
        </div>
      )}
    </DrawerShell>
  );
}

// ── Run dialog ────────────────────────────────────────────────────

function RunDialog({
  open, onClose, lang, t,
}: {
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"hr">>["t"];
}) {
  const [period, setPeriod] = useState("2026-06");
  const [saving, setSaving] = useState(false);

  async function handleRun() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onClose();
    toast.success(t("payroll.run_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("payroll.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!period || saving} onClick={handleRun}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {t("payroll.new")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("payroll.form_period")} *</Label>
          <Input
            value={period}
            onChange={e => setPeriod(e.target.value)}
            placeholder="YYYY-MM"
            dir="ltr"
          />
        </div>
      </div>
    </ModalShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function PayrollPage() {
  const { t, i18n } = useTranslation("hr");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useHrData();

  const [selected, setSelected] = useState<PayrollRun | null>(null);
  const [runOpen, setRunOpen]   = useState(false);
  const [postedIds, setPosted]  = useState<Set<string>>(() => new Set());

  const runs     = data?.payrollRuns ?? [];
  const employees = data?.employees ?? [];

  function handlePost(id: string) {
    setPosted(prev => new Set([...prev, id]));
    setSelected(null);
    toast.success(t("payroll.posted_toast"));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("payroll.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <Skeleton className="h-3.5 w-28 font-mono" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-5 w-16 rounded-full ms-auto" />
              <Skeleton className="h-3.5 w-24 tabular-nums" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("payroll.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("payroll.title")}
          subtitle={t("payroll.count", { n: runs.length })}
          actions={
            can("hr.payroll.run") ? (
              <Button size="sm" onClick={() => setRunOpen(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("payroll.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        <PageSection padded={false}>
          {runs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("payroll.no_payroll")}
              description={t("payroll.empty_sub")}
              action={can("hr.payroll.run")
                ? { label: t("payroll.new"), onClick: () => setRunOpen(true) }
                : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {["col_number","col_period","col_status","col_total","col_actions"].map(k => (
                      <TableHead key={k} className={cn(
                        "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                        k === "col_total" && "text-end",
                        k === "col_actions" && "text-end",
                      )}>
                        {t(`payroll.${k}` as Parameters<typeof t>[0])}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...runs].reverse().map(run => {
                    const isPosted = run.status === "posted" || postedIds.has(run.id);
                    const hasWarnings = (run.warnings ?? []).length > 0;
                    return (
                      <TableRow
                        key={run.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelected(run)}
                      >
                        <TableCell>
                          <span className="font-mono text-sm">{run.number}</span>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums" dir="ltr">{run.period}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusPill
                              variant={isPosted ? "success" : "secondary"}
                              label={t(isPosted ? "payroll.status_posted" : "payroll.status_draft")}
                            />
                            {hasWarnings && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-end tabular-nums text-sm font-medium">
                          {run.total_net !== null ? formatMoney(run.total_net, lang) : "—"}
                        </TableCell>
                        <TableCell className="text-end">
                          {!isPosted && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={e => { e.stopPropagation(); handlePost(run.id); }}
                            >
                              {t("payroll.post_btn")}
                            </Button>
                          )}
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

      <PayrollSheet
        run={selected}
        employees={employees}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onPost={handlePost}
        lang={lang}
        t={t}
      />
      <RunDialog open={runOpen} onClose={() => setRunOpen(false)} lang={lang} t={t} />
    </>
  );
}
