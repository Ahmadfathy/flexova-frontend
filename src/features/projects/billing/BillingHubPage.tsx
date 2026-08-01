import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, ClipboardCheck, Clock3, Wallet } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton, Skeleton } from "@/components/patterns/Skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore } from "@/stores/projectsStore";
import { useMockState } from "../useMockState";
import { entryHours, timeEntryBilledAmount, expenseBilledAmount } from "../detail/ledger";
import { InvoicePreviewModal, type PreviewLine } from "./InvoicePreviewModal";
import type { Milestone, TimeEntry, Expense } from "@/features/projects/types";

interface LineRowProps {
  checked: boolean;
  onCheck: (v: boolean) => void;
  title: string;
  subtitle?: string;
  /** null when hidden by the `financials` gate (spec §9.9). */
  amount: number | null;
  lang: "ar" | "en";
  disabled?: boolean;
  badge?: string;
}

function LineRow({ checked, onCheck, title, subtitle, amount, lang, disabled, badge }: LineRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 border-b border-border last:border-0">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Checkbox checked={checked} onCheckedChange={(v) => onCheck(!!v)} disabled={disabled} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {badge && <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground text-[10px] shrink-0">{badge}</Badge>}
            <p className="text-sm font-medium truncate">{title}</p>
          </div>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      <span className="text-sm font-medium tabular-nums sm:w-28 sm:text-end shrink-0 ps-8 sm:ps-0">
        {amount != null ? formatMoney(amount, lang) : "—"}
      </span>
    </div>
  );
}

export function BillingHubPage() {
  const { t } = useTranslation(["projects", "common"]);
  const { lang } = useAppearance();
  const can = useCan();

  const projects = useProjectsStore((s) => s.projects);
  const milestones = useProjectsStore((s) => s.milestones);
  const timeEntries = useProjectsStore((s) => s.time_entries);
  const expenses = useProjectsStore((s) => s.expenses);
  const retainers = useProjectsStore((s) => s.retainers);
  const generateMilestoneInvoice = useProjectsStore((s) => s.generateMilestoneInvoice);
  const generateTmInvoice = useProjectsStore((s) => s.generateTmInvoice);
  const drawRetainer = useProjectsStore((s) => s.drawRetainer);

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const canGenerate = can("projects.invoice.create");
  const canFinancials = can("projects.financials");

  const projectList = useMemo(
    () => Object.values(projects).sort((a, b) => a.code.localeCompare(b.code)),
    [projects]
  );
  const [projectId, setProjectId] = useState(() => projectList[0]?.id ?? "");
  const project = projectId ? projects[projectId] : undefined;

  const [msSelected, setMsSelected] = useState<Set<string>>(new Set());
  const [tmTimeSelected, setTmTimeSelected] = useState<Set<string>>(new Set());
  const [tmExpenseSelected, setTmExpenseSelected] = useState<Set<string>>(new Set());
  const [retTimeSelected, setRetTimeSelected] = useState<Set<string>>(new Set());
  const [retExpenseSelected, setRetExpenseSelected] = useState<Set<string>>(new Set());

  const [previewLines, setPreviewLines] = useState<PreviewLine[] | null>(null);
  const [previewKind, setPreviewKind] = useState<"milestone" | "tm" | null>(null);

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string, on: boolean) {
    const next = new Set(set);
    if (on) next.add(id); else next.delete(id);
    setSet(next);
  }

  const approvedFixedMilestones = useMemo(
    () => (forcedEmpty ? [] : Object.values(milestones).filter(
      (m) => m.project_id === projectId && m.state === "approved" && m.billing_type === "fixed"
    )),
    [milestones, projectId, forcedEmpty]
  );

  const billableEntries = useMemo(
    () => (forcedEmpty ? [] : Object.values(timeEntries).filter(
      (e) => e.project_id === projectId && e.state === "approved" && e.billable && !e.invoiced
    )),
    [timeEntries, projectId, forcedEmpty]
  );
  const billableExpenses = useMemo(
    () => (forcedEmpty ? [] : Object.values(expenses).filter(
      (x) => x.project_id === projectId && x.billable && !x.invoiced
    )),
    [expenses, projectId, forcedEmpty]
  );

  const retainer = project?.retainer_id ? retainers[project.retainer_id] : undefined;
  const retainerLow = !!retainer && retainer.balance <= retainer.low_threshold;

  function milestoneTitle(m: Milestone) {
    return lang === "ar" ? m.name_ar : m.name_en;
  }
  function entrySubtitle(e: TimeEntry) {
    return `${formatDate(e.date)} · ${entryHours(e).toFixed(2)}h × ${formatMoney(e.rate_resolved ?? 0, lang)}`;
  }
  function expenseSubtitle(x: Expense) {
    return x.markup > 0 ? `${t("expense.markup")}: ${x.markup}%` : undefined;
  }

  function openMilestonePreview() {
    const selected = approvedFixedMilestones.filter((m) => msSelected.has(m.id));
    if (selected.length === 0) return;
    setPreviewKind("milestone");
    setPreviewLines(selected.map((m) => ({ id: m.id, label: milestoneTitle(m), amount: m.fixed_amount ?? 0 })));
  }

  function openTmPreview() {
    const entries = billableEntries.filter((e) => tmTimeSelected.has(e.id));
    const exps = billableExpenses.filter((x) => tmExpenseSelected.has(x.id));
    if (entries.length === 0 && exps.length === 0) return;
    setPreviewKind("tm");
    setPreviewLines([
      ...entries.map((e) => ({ id: e.id, label: e.description_ar || t("time.title"), meta: entrySubtitle(e), amount: timeEntryBilledAmount(e) })),
      ...exps.map((x) => ({ id: x.id, label: x.description_ar, meta: expenseSubtitle(x), amount: expenseBilledAmount(x) })),
    ]);
  }

  function confirmGenerate() {
    if (previewKind === "milestone") {
      const inv = generateMilestoneInvoice(projectId, Array.from(msSelected));
      if (inv) { toast.success(t("bill.generated_toast", { number: inv.number })); setMsSelected(new Set()); }
    } else if (previewKind === "tm") {
      const inv = generateTmInvoice(projectId, Array.from(tmTimeSelected), Array.from(tmExpenseSelected));
      if (inv) {
        toast.success(t("bill.generated_toast", { number: inv.number }));
        setTmTimeSelected(new Set());
        setTmExpenseSelected(new Set());
      }
    }
    setPreviewLines(null);
    setPreviewKind(null);
  }

  function handleDraw() {
    if (!retainer) return;
    const result = drawRetainer(retainer.id, Array.from(retTimeSelected), Array.from(retExpenseSelected));
    if (result.ok) {
      toast.success(t("bill.draw_success", { amount: formatMoney(result.amount, lang) }));
      setRetTimeSelected(new Set());
      setRetExpenseSelected(new Set());
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("bill.title")} />
        <Skeleton className="h-12 w-full" />
        <TableSkeleton rows={5} cols={4} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("bill.title")} />
        <PageSection><ErrorState onRetry={reload} /></PageSection>
      </div>
    );
  }

  const readOnly = isOffline || !canGenerate;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={t("bill.title")} alert={isOffline ? <OfflineBanner message={t("list.offline_note")} /> : undefined} />

      <PageSection padded={false}>
        <div className="px-4 py-3 border-b border-border">
          <Select value={projectId} onValueChange={(v) => { setProjectId(v); setMsSelected(new Set()); setTmTimeSelected(new Set()); setTmExpenseSelected(new Set()); setRetTimeSelected(new Set()); setRetExpenseSelected(new Set()); }}>
            <SelectTrigger className="h-10 w-full sm:w-80"><SelectValue /></SelectTrigger>
            <SelectContent>
              {projectList.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.code} — {lang === "ar" ? p.title_ar : p.title_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!project ? (
          <EmptyState title={t("bill.empty")} />
        ) : (
          <Tabs defaultValue="ms" className="p-4">
            <TabsList>
              <TabsTrigger value="ms"><ClipboardCheck className="h-3.5 w-3.5 me-1.5" />{t("bill.tab_ms")}</TabsTrigger>
              <TabsTrigger value="tm"><Clock3 className="h-3.5 w-3.5 me-1.5" />{t("bill.tab_tm")}</TabsTrigger>
              <TabsTrigger value="ret"><Wallet className="h-3.5 w-3.5 me-1.5" />{t("bill.tab_ret")}</TabsTrigger>
            </TabsList>

            {/* ── Milestone tab ─────────────────────────────────────── */}
            <TabsContent value="ms">
              {approvedFixedMilestones.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title={t("bill.empty")} />
              ) : (
                <div className="rounded border border-border">
                  {approvedFixedMilestones.map((m) => (
                    <LineRow
                      key={m.id}
                      checked={msSelected.has(m.id)}
                      onCheck={(v) => toggle(msSelected, setMsSelected, m.id, v)}
                      title={milestoneTitle(m)}
                      subtitle={m.target_date ? formatDate(m.target_date) : undefined}
                      amount={canFinancials ? (m.fixed_amount ?? 0) : null}
                      lang={lang}
                      disabled={readOnly}
                    />
                  ))}
                </div>
              )}
              {msSelected.size > 0 && (
                <div className="flex items-center justify-between pt-3">
                  <span className="text-sm text-muted-foreground">{t("bill.select_lines")}: {msSelected.size}</span>
                  <Button size="sm" disabled={readOnly} onClick={openMilestonePreview}>{t("bill.generate")}</Button>
                </div>
              )}
            </TabsContent>

            {/* ── Time & materials tab ──────────────────────────────── */}
            <TabsContent value="tm">
              {billableEntries.length === 0 && billableExpenses.length === 0 ? (
                <EmptyState icon={Clock3} title={t("bill.empty")} />
              ) : (
                <div className="rounded border border-border">
                  {billableEntries.map((e) => (
                    <LineRow
                      key={e.id}
                      checked={tmTimeSelected.has(e.id)}
                      onCheck={(v) => toggle(tmTimeSelected, setTmTimeSelected, e.id, v)}
                      title={e.description_ar || t("time.title")}
                      subtitle={canFinancials ? entrySubtitle(e) : formatDate(e.date)}
                      amount={canFinancials ? timeEntryBilledAmount(e) : null}
                      lang={lang}
                      disabled={readOnly}
                      badge={t("time.title")}
                    />
                  ))}
                  {billableExpenses.map((x) => (
                    <LineRow
                      key={x.id}
                      checked={tmExpenseSelected.has(x.id)}
                      onCheck={(v) => toggle(tmExpenseSelected, setTmExpenseSelected, x.id, v)}
                      title={x.description_ar}
                      subtitle={expenseSubtitle(x)}
                      amount={canFinancials ? expenseBilledAmount(x) : null}
                      lang={lang}
                      disabled={readOnly}
                      badge={t("expense.title")}
                    />
                  ))}
                </div>
              )}
              {(tmTimeSelected.size + tmExpenseSelected.size) > 0 && (
                <div className="flex items-center justify-between pt-3">
                  <span className="text-sm text-muted-foreground">{t("bill.select_lines")}: {tmTimeSelected.size + tmExpenseSelected.size}</span>
                  <Button size="sm" disabled={readOnly} onClick={openTmPreview}>{t("bill.generate")}</Button>
                </div>
              )}
            </TabsContent>

            {/* ── Retainer tab ──────────────────────────────────────── */}
            <TabsContent value="ret">
              {!retainer ? (
                <EmptyState icon={Wallet} title={t("bill.empty")} />
              ) : (
                <>
                  <div className="rounded border border-border p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("ret.balance")}</p>
                      <p className="text-xl font-semibold tabular-nums">{formatMoney(retainer.balance, lang)}</p>
                    </div>
                    <div className="text-end">
                      <p className="text-xs text-muted-foreground">{t("ret.opening")}</p>
                      <p className="text-sm tabular-nums">{formatMoney(retainer.opening_amount, lang)}</p>
                    </div>
                  </div>

                  {retainerLow && (
                    <div className="flex items-center gap-2 px-4 py-2 mb-4 bg-warning-tint text-warning-text text-sm font-medium rounded border border-warning/20">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{t("bill.topup")}</span>
                    </div>
                  )}

                  {billableEntries.length === 0 && billableExpenses.length === 0 ? (
                    <EmptyState icon={Wallet} title={t("bill.empty")} />
                  ) : (
                    <div className="rounded border border-border">
                      {billableEntries.map((e) => (
                        <LineRow
                          key={e.id}
                          checked={retTimeSelected.has(e.id)}
                          onCheck={(v) => toggle(retTimeSelected, setRetTimeSelected, e.id, v)}
                          title={e.description_ar || t("time.title")}
                          subtitle={canFinancials ? entrySubtitle(e) : formatDate(e.date)}
                          amount={canFinancials ? timeEntryBilledAmount(e) : null}
                          lang={lang}
                          disabled={readOnly}
                          badge={t("time.title")}
                        />
                      ))}
                      {billableExpenses.map((x) => (
                        <LineRow
                          key={x.id}
                          checked={retExpenseSelected.has(x.id)}
                          onCheck={(v) => toggle(retExpenseSelected, setRetExpenseSelected, x.id, v)}
                          title={x.description_ar}
                          subtitle={expenseSubtitle(x)}
                          amount={canFinancials ? expenseBilledAmount(x) : null}
                          lang={lang}
                          disabled={readOnly}
                          badge={t("expense.title")}
                        />
                      ))}
                    </div>
                  )}
                  {(retTimeSelected.size + retExpenseSelected.size) > 0 && (
                    <div className="flex items-center justify-between pt-3">
                      <span className="text-sm text-muted-foreground">{t("bill.select_lines")}: {retTimeSelected.size + retExpenseSelected.size}</span>
                      <Button size="sm" disabled={readOnly} onClick={handleDraw}>{t("bill.draw")}</Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </PageSection>

      {previewLines && (
        <InvoicePreviewModal
          open={previewLines !== null}
          onOpenChange={(o) => { if (!o) { setPreviewLines(null); setPreviewKind(null); } }}
          lines={previewLines}
          onConfirm={confirmGenerate}
        />
      )}
    </div>
  );
}
