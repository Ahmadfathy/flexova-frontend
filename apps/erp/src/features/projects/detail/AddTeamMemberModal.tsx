import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppearance } from "@/stores/appearance";
import type { ProjectEmployee } from "@/features/projects/types";

interface AddTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: ProjectEmployee[];
  onSave: (employeeId: string, projectRole: string) => void;
}

/** Add-member modal for the Team tab — picks from HR employees not already on the project (spec §10.3). */
export function AddTeamMemberModal({ open, onOpenChange, candidates, onSave }: AddTeamMemberModalProps) {
  const { t } = useTranslation("projects");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();

  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmployeeId(candidates[0]?.id ?? "");
    setRole("");
    setAttempted(false);
  }, [open, candidates]);

  const employeeError = attempted && !employeeId ? t("form.client_required") : undefined;
  const roleError = attempted && !role.trim() ? t("form.type_label_required") : undefined;

  function handleSave() {
    setAttempted(true);
    if (!employeeId || !role.trim()) return;
    onSave(employeeId, role.trim());
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("team.add")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button onClick={handleSave} disabled={candidates.length === 0}>{tCommon("save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("team.all_added")}</p>
        ) : (
          <>
            <FormField label={t("team.employee")} required error={employeeError}>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {candidates.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{lang === "ar" ? e.name_ar : e.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label={t("team.role")} required error={roleError}>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder={t("team.role_placeholder")} />
            </FormField>
          </>
        )}
      </div>
    </ModalShell>
  );
}
