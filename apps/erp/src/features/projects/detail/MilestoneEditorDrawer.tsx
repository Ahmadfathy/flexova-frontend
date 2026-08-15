import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DrawerShell } from "@/components/patterns/DrawerShell";
import { FormField, FormGrid } from "@/components/patterns/FormLayout";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Milestone, MilestoneBillingType } from "@/features/projects/types";
import type { MilestoneFormInput } from "@/stores/projectsStore";

const ALL_MS_TYPES: MilestoneBillingType[] = ["fixed", "tm", "retainer"];

interface MilestoneEditorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: Milestone | null; // null = creating new
  onSave: (input: MilestoneFormInput) => void;
}

const EMPTY: MilestoneFormInput = {
  name_ar: "", name_en: "", billing_type: "tm", fixed_amount: null, hours_estimated: null, target_date: null, notes: "",
};

export function MilestoneEditorDrawer({ open, onOpenChange, milestone, onSave }: MilestoneEditorDrawerProps) {
  const { t } = useTranslation("projects");
  const { t: tCommon } = useTranslation("common");

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [billingType, setBillingType] = useState<MilestoneBillingType>("tm");
  const [fixedAmount, setFixedAmount] = useState("");
  const [hoursEstimated, setHoursEstimated] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const source = milestone ?? EMPTY;
    setNameAr(source.name_ar);
    setNameEn(source.name_en);
    setBillingType(source.billing_type);
    setFixedAmount(source.fixed_amount != null ? String(source.fixed_amount) : "");
    setHoursEstimated(source.hours_estimated != null ? String(source.hours_estimated) : "");
    setTargetDate(source.target_date ?? "");
    setNotes(source.notes ?? "");
    setAttempted(false);
  }, [open, milestone]);

  const nameArError = attempted && !nameAr.trim() ? t("form.title_ar_required") : undefined;
  const nameEnError = attempted && !nameEn.trim() ? t("form.title_en_required") : undefined;

  function handleSave() {
    setAttempted(true);
    if (!nameAr.trim() || !nameEn.trim()) return;
    onSave({
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      billing_type: billingType,
      fixed_amount: billingType === "fixed" && fixedAmount ? parseFloat(fixedAmount) : null,
      hours_estimated: hoursEstimated ? parseFloat(hoursEstimated) : null,
      target_date: targetDate || null,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={milestone ? t("ms.drawer_title_edit") : t("ms.drawer_title_new")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button onClick={handleSave}>{tCommon("save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t("form.milestone_name_ar")} required error={nameArError}>
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
        </FormField>
        <FormField label={t("form.milestone_name_en")} required error={nameEnError}>
          <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
        </FormField>

        <FormField label={t("form.milestone_billing_type")} required>
          <Select value={billingType} onValueChange={(v) => setBillingType(v as MilestoneBillingType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_MS_TYPES.map((mt) => <SelectItem key={mt} value={mt}>{t(`ms_type.${mt}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        <FormGrid cols={2}>
          {billingType === "fixed" && (
            <FormField label={t("form.milestone_amount")}>
              <Input type="number" min={0} className="tabular-nums" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} />
            </FormField>
          )}
          <FormField label={t("form.milestone_hours_est")}>
            <Input type="number" min={0} className="tabular-nums" value={hoursEstimated} onChange={(e) => setHoursEstimated(e.target.value)} />
          </FormField>
        </FormGrid>

        <FormField label={t("form.milestone_target_date")}>
          <DatePicker value={targetDate} onChange={setTargetDate} />
        </FormField>

        <FormField label={t("ms.notes")}>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </FormField>
      </div>
    </DrawerShell>
  );
}
