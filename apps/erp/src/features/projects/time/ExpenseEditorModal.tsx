import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField, FormGrid } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore } from "@/stores/projectsStore";
import type { ExpenseFormInput } from "@/stores/projectsStore";
import type { Expense } from "@/features/projects/types";

interface ExpenseEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  expense: Expense | null; // null = new
  onSave: (input: ExpenseFormInput) => void;
}

export function ExpenseEditorModal({ open, onOpenChange, projectId, expense, onSave }: ExpenseEditorModalProps) {
  const { t } = useTranslation("projects");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();
  const can = useCan();
  const canMarkup = can("projects.expense.markup");

  const milestones = useProjectsStore((s) => s.milestones);
  const projectMilestones = useMemo(
    () => Object.values(milestones).filter((m) => m.project_id === projectId),
    [milestones, projectId]
  );

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [billable, setBillable] = useState(true);
  const [markup, setMarkup] = useState("0");
  const [milestoneId, setMilestoneId] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setDescription(expense.description_ar);
      setAmount(String(expense.amount));
      setBillable(expense.billable);
      setMarkup(String(expense.markup));
      setMilestoneId(expense.milestone_id ?? "");
    } else {
      setDescription("");
      setAmount("");
      setBillable(true);
      setMarkup("0");
      setMilestoneId("");
    }
    setAttempted(false);
  }, [open, expense]);

  const descriptionError = attempted && !description.trim() ? t("form.title_ar_required") : undefined;
  const amountError = attempted && !(parseFloat(amount) > 0) ? t("time.minutes_required") : undefined;

  function handleSave() {
    setAttempted(true);
    if (!description.trim() || !(parseFloat(amount) > 0)) return;
    onSave({
      description_ar: description.trim(),
      amount: parseFloat(amount),
      billable,
      markup: canMarkup && markup ? parseFloat(markup) : 0,
      milestone_id: milestoneId || null,
    });
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? t("expense.edit") : t("expense.add")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button onClick={handleSave}>{tCommon("save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t("expense.description")} required error={descriptionError}>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} dir="rtl" />
        </FormField>

        <FormGrid cols={2}>
          <FormField label={t("expense.amount")} required error={amountError}>
            <Input type="number" min={0} className="tabular-nums" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          <FormField label={t("expense.markup")} helper={!canMarkup ? t("expense.markup_locked") : undefined}>
            <Input type="number" min={0} className="tabular-nums" value={markup} onChange={(e) => setMarkup(e.target.value)} disabled={!canMarkup} />
          </FormField>
        </FormGrid>

        <FormField label={t("tab.milestones")}>
          <Select value={milestoneId || "__none__"} onValueChange={(v) => setMilestoneId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {projectMilestones.map((m) => (
                <SelectItem key={m.id} value={m.id}>{lang === "ar" ? m.name_ar : m.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={t("time.billable")}>
          <Switch checked={billable} onCheckedChange={setBillable} />
        </FormField>
      </div>
    </ModalShell>
  );
}
