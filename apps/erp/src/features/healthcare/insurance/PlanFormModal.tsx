import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHealthcareInsurance } from "@/stores/healthcareInsurance";
import type { HcPlan } from "@/features/healthcare/types";

interface PlanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payerId: string;
  /** Present when editing an existing plan instead of creating one. */
  editingPlan?: HcPlan;
}

const EMPTY = { name: "", coverage: "80", capType: "annual" as "annual" | "per_visit", capAmount: "", coPayType: "fixed" as "fixed" | "pct", coPayValue: "", exclusions: "" };

/** Add/edit coverage plan (spec §8.2) — the values the encounter split engine reads. */
export function PlanFormModal({ open, onOpenChange, payerId, editingPlan }: PlanFormModalProps) {
  const { t } = useTranslation("healthcare");
  const addPlan = useHealthcareInsurance((s) => s.addPlan);
  const updatePlan = useHealthcareInsurance((s) => s.updatePlan);

  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editingPlan) {
      setForm({
        name: editingPlan.name_ar, coverage: String(editingPlan.coverage_pct),
        capType: editingPlan.cap_type, capAmount: String(editingPlan.cap_amount),
        coPayType: editingPlan.co_pay_type, coPayValue: String(editingPlan.co_pay_value),
        exclusions: editingPlan.exclusions.join("، "),
      });
    } else if (open) {
      setForm(EMPTY);
    }
  }, [editingPlan, open]);

  function handleSave() {
    const coverage_pct = Number(form.coverage);
    const cap_amount = Number(form.capAmount);
    const co_pay_value = Number(form.coPayValue);
    if (!form.name.trim() || !Number.isFinite(coverage_pct) || !Number.isFinite(cap_amount) || !Number.isFinite(co_pay_value)) {
      toast.error(t("insurance.plan_missing_fields"));
      return;
    }
    const exclusions = form.exclusions.split(/[،,]/).map((s) => s.trim()).filter(Boolean);
    const payload = { name_ar: form.name.trim(), coverage_pct, cap_type: form.capType, cap_amount, co_pay_type: form.coPayType, co_pay_value, exclusions };

    if (editingPlan) updatePlan(editingPlan.id, payload);
    else addPlan(payerId, payload);

    toast.success(t(editingPlan ? "insurance.plan_updated" : "insurance.plan_added"));
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={editingPlan ? t("insurance.edit_plan") : t("insurance.new_plan")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSave}>{t("common:save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("insurance.field_plan_name")}</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("insurance.field_coverage_pct")}</Label>
            <Input value={form.coverage} onChange={(e) => setForm((f) => ({ ...f, coverage: e.target.value }))} inputMode="decimal" className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("insurance.field_cap_type")}</Label>
            <Select value={form.capType} onValueChange={(v) => setForm((f) => ({ ...f, capType: v as "annual" | "per_visit" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">{t("insurance.cap_annual")}</SelectItem>
                <SelectItem value="per_visit">{t("insurance.cap_per_visit")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("insurance.field_cap_amount")}</Label>
            <Input value={form.capAmount} onChange={(e) => setForm((f) => ({ ...f, capAmount: e.target.value }))} inputMode="decimal" className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("insurance.field_copay_type")}</Label>
            <Select value={form.coPayType} onValueChange={(v) => setForm((f) => ({ ...f, coPayType: v as "fixed" | "pct" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">{t("insurance.copay_fixed")}</SelectItem>
                <SelectItem value="pct">{t("insurance.copay_pct")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t("insurance.field_copay_value")}</Label>
            <Input value={form.coPayValue} onChange={(e) => setForm((f) => ({ ...f, coPayValue: e.target.value }))} inputMode="decimal" className="tabular-nums" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("insurance.field_exclusions")}</Label>
          <Input value={form.exclusions} onChange={(e) => setForm((f) => ({ ...f, exclusions: e.target.value }))} placeholder={t("insurance.field_exclusions_placeholder")} />
        </div>
      </div>
    </ModalShell>
  );
}
