import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useCan } from "@/lib/permissions";
import { usePlaySectorSettings } from "@/stores/playSectorSettings";
import type { PrepaidCafeteriaBilling, PeakCrossingNotify } from "@/features/play/types";
import { useSectorSettingsScreen } from "./useSectorSettingsScreen";

export default function SectorSettingsPage() {
  const { t } = useTranslation("play");
  const can = useCan();

  const prepaidCafeteriaBilling = usePlaySectorSettings((s) => s.prepaidCafeteriaBilling);
  const peakCrossingNotify = usePlaySectorSettings((s) => s.peakCrossingNotify);
  const prepaidBlockThresholdMin = usePlaySectorSettings((s) => s.prepaidBlockThresholdMin);
  const hrCommissionEnabled = usePlaySectorSettings((s) => s.hrCommissionEnabled);
  const setPrepaidCafeteriaBilling = usePlaySectorSettings((s) => s.setPrepaidCafeteriaBilling);
  const setPeakCrossingNotify = usePlaySectorSettings((s) => s.setPeakCrossingNotify);
  const setPrepaidBlockThresholdMin = usePlaySectorSettings((s) => s.setPrepaidBlockThresholdMin);
  const setHrCommissionEnabled = usePlaySectorSettings((s) => s.setHrCommissionEnabled);

  const { loading, error, isOffline, reload } = useSectorSettingsScreen();

  const [cafeBilling, setCafeBilling] = useState<PrepaidCafeteriaBilling>(prepaidCafeteriaBilling);
  const [peakNotify, setPeakNotify] = useState<PeakCrossingNotify>(peakCrossingNotify);
  const [thresholdMin, setThresholdMin] = useState(String(prepaidBlockThresholdMin));
  const [hrCommission, setHrCommission] = useState(hrCommissionEnabled);

  if (!can("play.config")) {
    return (
      <div>
        <PageHeader title={t("set.title")} />
        <PageSection>
          <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-16 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("set.permission_required")}</p>
          </div>
        </PageSection>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("set.title")} />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("set.title")} />
        <PageSection><ErrorState title={t("set.error_title")} description={t("set.error_body")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  function handleSave() {
    setPrepaidCafeteriaBilling(cafeBilling);
    setPeakCrossingNotify(peakNotify);
    setPrepaidBlockThresholdMin(parseInt(thresholdMin, 10) || 0);
    setHrCommissionEnabled(hrCommission);
    toast.success(t("set.saved_toast"));
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("set.title")}
        alert={isOffline ? <OfflineBanner message={t("set.offline_note")} /> : undefined}
      />

      <PageSection className="max-w-2xl space-y-5">
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("set.prepaid_cafe")}</p>
          <Select value={cafeBilling} onValueChange={(v) => setCafeBilling(v as PrepaidCafeteriaBilling)}>
            <SelectTrigger className="max-w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="separate">{t("set.separate")}</SelectItem>
              <SelectItem value="combined">{t("set.combined")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("set.peak_notify")}</p>
          <Select value={peakNotify} onValueChange={(v) => setPeakNotify(v as PeakCrossingNotify)}>
            <SelectTrigger className="max-w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="silent">{t("set.silent")}</SelectItem>
              <SelectItem value="notify">{t("set.notify")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("set.block_threshold")}</p>
          <Input
            type="number" min={0} step={1} value={thresholdMin}
            onChange={(e) => setThresholdMin(e.target.value)}
            className="h-10 tabular-nums max-w-40"
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-normal">{t("set.hr_commission")}</Label>
            <Switch checked={hrCommission} onCheckedChange={setHrCommission} />
          </div>
          <p className="text-xs text-muted-foreground">{t("set.hr_commission_hint")}</p>
        </div>

        <Button size="sm" onClick={handleSave}>{t("set.save")}</Button>
      </PageSection>
    </div>
  );
}
