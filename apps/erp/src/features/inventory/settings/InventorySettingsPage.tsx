/**
 * DD-3 §2.1 — Inventory Settings → Costing: the tenant-wide `default_costing_method` (FIFO or
 * Weighted Average), inherited by any item with no per-item override (Item Editor's Costing
 * select). A genuinely new surface — DD-1/DD-2 never built an Inventory Settings page (their
 * `global_near_expiry_days` setting still has no edit UI; out of scope here, disclosed).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { useCan } from "@/lib/permissions";
import { useItems } from "../items/useItems";

export function InventorySettingsPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can = useCan();

  const { data, loading, error, isOffline, reload, mutate } = useItems();
  const canEdit = can("inventory.costing.method_edit");

  const [pendingMethod, setPendingMethod] = useState<"fifo" | "average" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { setPendingMethod(null); }, [data?.settings?.default_costing_method]);

  const currentMethod = data?.settings?.default_costing_method ?? "fifo";

  function handleChange(value: string) {
    if (!canEdit || value === currentMethod) return;
    setPendingMethod(value as "fifo" | "average");
    setConfirmOpen(true);
  }

  function confirmChange() {
    if (!pendingMethod) return;
    mutate((prev) => prev && { ...prev, settings: { ...(prev.settings ?? { global_near_expiry_days: 30 }), default_costing_method: pendingMethod } });
    toast.success(t("costing.default_method"));
    setConfirmOpen(false);
    setPendingMethod(null);
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("costing.default_method")} />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (error && !isOffline) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("costing.default_method")} />
        <ErrorState description={t("errors.load")} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={lang === "ar" ? "إعدادات المخزون" : "Inventory settings"}
        alert={isOffline ? <OfflineBanner message={t("offline.banner")} /> : undefined}
      />

      <PageSection title={t("costing.default_method")} subtitle={t("costing.default_method_hint")}>
        <RadioGroup
          data-testid="default-costing-method"
          value={currentMethod}
          onValueChange={handleChange}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="fifo" id="method-fifo" disabled={!canEdit} />
            <Label htmlFor="method-fifo" className="cursor-pointer">{t("costing.method.fifo")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="average" id="method-average" disabled={!canEdit} />
            <Label htmlFor="method-average" className="cursor-pointer">{t("costing.method.average")}</Label>
          </div>
        </RadioGroup>
      </PageSection>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("costing.default_method")}
        description={t("costing.change_default_confirm")}
        confirmTone="warning"
        confirmLabel={t("actions.confirm")}
        onConfirm={confirmChange}
      />
    </div>
  );
}
