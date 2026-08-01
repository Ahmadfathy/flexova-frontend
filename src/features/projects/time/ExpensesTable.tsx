import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Receipt } from "lucide-react";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { DataTable, ActionCell, type Column } from "@/components/patterns/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore } from "@/stores/projectsStore";
import { ExpenseEditorModal } from "./ExpenseEditorModal";
import type { Expense } from "@/features/projects/types";

interface ExpensesTableProps {
  projectId: string;
  isOffline?: boolean;
}

export function ExpensesTable({ projectId, isOffline }: ExpensesTableProps) {
  const { t } = useTranslation("projects");
  const { lang } = useAppearance();
  const can = useCan();

  const allExpenses = useProjectsStore((s) => s.expenses);
  const milestones = useProjectsStore((s) => s.milestones);
  const addExpense = useProjectsStore((s) => s.addExpense);
  const updateExpense = useProjectsStore((s) => s.updateExpense);

  // Same offline-writable exception as the timesheet table (spec §7.6).
  const canEdit = can("projects.expense.edit");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);

  const expenses = useMemo(
    () => Object.values(allExpenses).filter((e) => e.project_id === projectId),
    [allExpenses, projectId]
  );

  function milestoneName(id: string | null) {
    if (!id) return "—";
    const m = milestones[id];
    return m ? (lang === "ar" ? m.name_ar : m.name_en) : "—";
  }

  function openNew() {
    setEditTarget(null);
    setModalOpen(true);
  }
  function openEdit(e: Expense) {
    setEditTarget(e);
    setModalOpen(true);
  }
  function handleSave(input: Parameters<typeof addExpense>[1]) {
    if (editTarget) updateExpense(editTarget.id, input);
    else addExpense(projectId, input, isOffline);
    setModalOpen(false);
  }

  const columns: Column<Expense>[] = [
    { key: "description", header: t("expense.description"), cell: (e) => e.description_ar },
    { key: "amount", header: t("expense.amount"), numeric: true, cell: (e) => <span className="tabular-nums">{formatMoney(e.amount, lang)}</span> },
    {
      key: "billable", header: t("time.billable"),
      cell: (e) => (
        <Badge variant="outline" className={e.billable ? "border-transparent bg-success-tint text-success-text" : "border-transparent bg-muted text-muted-foreground"}>
          {e.billable ? tCommonYes() : tCommonNo()}
        </Badge>
      ),
    },
    { key: "markup", header: t("expense.markup"), numeric: true, cell: (e) => <span className="tabular-nums">{e.markup}</span> },
    { key: "milestone", header: t("tab.milestones"), cell: (e) => milestoneName(e.milestone_id) },
    {
      key: "invoiced", header: t("expense.invoiced"),
      cell: (e) => (
        <Badge variant="outline" className={e.invoiced ? "border-transparent bg-success-tint text-success-text" : "border-transparent bg-muted text-muted-foreground"}>
          {e.invoiced ? tCommonYes() : tCommonNo()}
        </Badge>
      ),
    },
    {
      key: "actions", header: "",
      cell: (e) => (
        <ActionCell
          actions={canEdit && !e.invoiced ? [{ icon: <Pencil className="h-3.5 w-3.5" />, label: t("common:edit"), onClick: () => openEdit(e) }] : []}
        />
      ),
    },
  ];

  function tCommonYes() { return lang === "ar" ? "نعم" : "Yes"; }
  function tCommonNo() { return lang === "ar" ? "لا" : "No"; }

  return (
    <PageSection
      title={t("expense.title")}
      actions={canEdit ? <Button size="sm" variant="outline" onClick={openNew}><Plus className="h-4 w-4 me-1.5" />{t("expense.add")}</Button> : undefined}
    >
      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title={t("expense.empty_title")} />
      ) : (
        <div className="overflow-x-auto -mx-6">
          <div className="px-6">
            <DataTable columns={columns} data={expenses} keyExtractor={(e) => e.id} />
          </div>
        </div>
      )}

      <ExpenseEditorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectId={projectId}
        expense={editTarget}
        onSave={handleSave}
      />
    </PageSection>
  );
}
