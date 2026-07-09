import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lock, Users2, Hash, MessageSquareText, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useRprSettings } from "@/stores/rprSettings";
import { useRprWorkOrders } from "@/stores/rprWorkOrders";
import { TECHNICIANS, COMMISSION_RULES, SETTINGS, technicianName } from "./catalog";

/** /repair/settings — Workshop settings (back-office shell, not PosLayout, per FE_12 §1's
 * explicit "settings/reports are back-office" call). Reads commission rules from the repair
 * catalog's own reference data (sourced `"hr"` in the fixture) — display only, not redefined
 * here (spec §7: "READ FROM HR — do not redefine"). */
export default function RepairSettingsPage() {
  const { t } = useTranslation("repair");
  const { lang } = useAppearance();
  const can = useCan();

  const diagnosisFeeEnabled = useRprSettings((s) => s.diagnosisFeeEnabled);
  const diagnosisFeeAmount = useRprSettings((s) => s.diagnosisFeeAmount);
  const defaultWarrantyDays = useRprSettings((s) => s.defaultWarrantyDays);
  const whatsappApprovalTemplate = useRprSettings((s) => s.whatsappApprovalTemplate);
  const whatsappReadyTemplate = useRprSettings((s) => s.whatsappReadyTemplate);
  const setDiagnosisFee = useRprSettings((s) => s.setDiagnosisFee);
  const setDefaultWarrantyDays = useRprSettings((s) => s.setDefaultWarrantyDays);
  const setWhatsappTemplates = useRprSettings((s) => s.setWhatsappTemplates);
  const nextNumber = useRprWorkOrders((s) => s.nextNumber);

  const [feeEnabled, setFeeEnabled] = useState(diagnosisFeeEnabled);
  const [feeAmount, setFeeAmount] = useState(String(diagnosisFeeAmount));
  const [warrantyDays, setWarrantyDays] = useState(String(defaultWarrantyDays));
  const [approvalTpl, setApprovalTpl] = useState(whatsappApprovalTemplate);
  const [readyTpl, setReadyTpl] = useState(whatsappReadyTemplate);

  if (!can("repair.settings.manage")) {
    return (
      <div>
        <PageHeader title={t("settings.title")} />
        <PageSection>
          <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-16 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("settings.permission_required")}</p>
          </div>
        </PageSection>
      </div>
    );
  }

  function handleSaveDiagnosisFee() {
    const amount = parseFloat(feeAmount) || 0;
    setDiagnosisFee(feeEnabled, amount);
    toast.success(t("settings.saved_toast"));
  }

  function handleSaveWarranty() {
    const days = parseInt(warrantyDays, 10) || 0;
    setDefaultWarrantyDays(days);
    toast.success(t("settings.saved_toast"));
  }

  function handleSaveTemplates() {
    setWhatsappTemplates(approvalTpl, readyTpl);
    toast.success(t("settings.saved_toast"));
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={t("settings.title")} />

      <PageSection className="max-w-2xl space-y-5">
        {/* Diagnosis fee */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("settings.diag_fee")}</p>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-normal">{t("settings.diag_fee_enable")}</Label>
            <Switch checked={feeEnabled} onCheckedChange={setFeeEnabled} />
          </div>
          {feeEnabled && (
            <div className="space-y-1.5">
              <Label>{t("settings.diag_fee_amount")}</Label>
              <Input
                type="number" min={0} step="1" value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                className="h-10 tabular-nums max-w-40"
              />
            </div>
          )}
          <Button size="sm" onClick={handleSaveDiagnosisFee}>{t("settings.save")}</Button>
        </div>

        {/* Default warranty period */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("settings.warranty_days")}</p>
          <div className="space-y-1.5">
            <Label>{t("settings.warranty_days_hint")}</Label>
            <Input
              type="number" min={0} step="1" value={warrantyDays}
              onChange={(e) => setWarrantyDays(e.target.value)}
              className="h-10 tabular-nums max-w-40"
            />
          </div>
          <Button size="sm" onClick={handleSaveWarranty}>{t("settings.save")}</Button>
        </div>

        {/* Technicians + commission rules (read from HR) */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Users2 className="h-3.5 w-3.5" /> {t("settings.technicians")}
          </p>
          <p className="text-xs text-muted-foreground -mt-1.5">{t("settings.technicians_hint")}</p>
          <div className="rounded border border-border divide-y divide-border overflow-hidden">
            {TECHNICIANS.map((tech) => {
              const rule = COMMISSION_RULES.find((r) => r.id === tech.commission_rule_id);
              return (
                <div key={tech.id} className="flex items-center justify-between gap-2 p-2.5 text-sm">
                  <span className="text-foreground">{technicianName(tech, lang)}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3 w-3" />
                    {/* commission_rules fixture only ever populates name_ar, despite the type
                        declaring name_en too — pre-existing fixture quirk, not fixed here */}
                    {rule ? `${rule.value}% — ${rule.name_ar}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Numbering (per-terminal, read-only display like POS's own settings page) */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" /> {t("settings.numbering")}
          </p>
          <div className="flex items-center justify-between pt-1.5 text-sm">
            <span className="text-muted-foreground">{t("settings.numbering_next")}</span>
            <span className="font-mono font-semibold tabular-nums" dir="ltr">{SETTINGS.wo_numbering.prefix}{nextNumber}</span>
          </div>
        </div>

        {/* WhatsApp templates */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MessageSquareText className="h-3.5 w-3.5" /> {t("settings.whatsapp_templates")}
          </p>
          <div className="space-y-1.5">
            <Label>{t("settings.template_approval")}</Label>
            <Textarea value={approvalTpl} onChange={(e) => setApprovalTpl(e.target.value)} rows={2} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("settings.template_ready")}</Label>
            <Textarea value={readyTpl} onChange={(e) => setReadyTpl(e.target.value)} rows={2} dir="rtl" />
          </div>
          <Button size="sm" onClick={handleSaveTemplates}>{t("settings.save")}</Button>
        </div>
      </PageSection>
    </div>
  );
}
