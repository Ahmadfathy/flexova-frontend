import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppearance } from "@/stores/appearance";
import { useProjectsStore } from "@/stores/projectsStore";
import type { DocumentFormInput } from "@/stores/projectsStore";

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSave: (input: DocumentFormInput) => void;
}

/** Upload modal for the Documents tab — reuses the file-attachment affordance (name + category) used elsewhere in the app (spec §10.1). */
export function DocumentUploadModal({ open, onOpenChange, projectId, onSave }: DocumentUploadModalProps) {
  const { t } = useTranslation("projects");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();

  const milestones = useProjectsStore((s) => s.milestones);
  const projectMilestones = useMemo(
    () => Object.values(milestones).filter((m) => m.project_id === projectId),
    [milestones, projectId]
  );

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setCategory("");
    setMilestoneId("");
    setAttempted(false);
  }, [open]);

  const nameError = attempted && !name.trim() ? t("doc.name_required") : undefined;
  const categoryError = attempted && !category.trim() ? t("doc.category_required") : undefined;

  function handleSave() {
    setAttempted(true);
    if (!name.trim() || !category.trim()) return;
    onSave({ name_ar: name.trim(), category_ar: category.trim(), milestone_id: milestoneId || null });
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("doc.upload")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button onClick={handleSave}>{tCommon("save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t("doc.name")} required error={nameError}>
          <Input value={name} onChange={(e) => setName(e.target.value)} dir="rtl" />
        </FormField>

        <FormField label={t("doc.category")} required error={categoryError}>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("doc.category_placeholder")} dir="rtl" />
        </FormField>

        <FormField label={t("doc.milestone_optional")}>
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
      </div>
    </ModalShell>
  );
}
