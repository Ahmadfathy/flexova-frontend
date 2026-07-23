import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LockKeyhole, CheckCircle2, Circle, XCircle, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { useVanSession } from "@/stores/vanSession";
import { getWarehouses, getReps, getRoutes } from "@/lib/mock/wholesale";
import {
  BUNDLE_STEPS, fetchBundleStepData, saveBundle, estimateBundleSizeBytes, formatBytes,
  type VanBundle, type BundleStepKey,
} from "@/lib/van/offline";
import accountingFixtures from "@/lib/mock/fixtures/accounting.fixtures.json";

interface Treasury { id: string; name_ar: string; name_en: string; type: string; branch_id: string; }
const TREASURIES = accountingFixtures.treasuries as Treasury[];

type StepStatus = "pending" | "running" | "done" | "error";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function VanShiftOpenPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("van");
  const { lang } = useAppearance();
  const openVanShift = useVanSession((s) => s.openVanShift);

  // No real user↔rep mapping exists in this mock's auth system — the first
  // rep stands in for "current user" (a real rep would only ever see their own).
  const currentRep = useMemo(() => getReps()[0], []);
  const vans = useMemo(
    () => getWarehouses().filter((w) => w.type === "van" && w.rep_id === currentRep?.id),
    [currentRep],
  );
  const route = useMemo(() => getRoutes().find((r) => r.rep_id === currentRep?.id), [currentRep]);

  const [vanId, setVanId] = useState(vans[0]?.id ?? "");
  const [openingFloat, setOpeningFloat] = useState("");
  const [note, setNote] = useState("");

  const selectedVan = vans.find((w) => w.id === vanId);
  const treasury = TREASURIES.find((tr) => tr.branch_id === selectedVan?.branch_id && tr.type === "cash");

  const [progressOpen, setProgressOpen] = useState(false);
  const [stepStatus, setStepStatus] = useState<Record<string, StepStatus>>({});
  const [failed, setFailed] = useState(false);
  const [bundleSize, setBundleSize] = useState<number | null>(null);

  async function runPrefetch() {
    setFailed(false);
    setBundleSize(null);
    setProgressOpen(true);
    setStepStatus(Object.fromEntries(BUNDLE_STEPS.map((s) => [s.key, "pending" as StepStatus])));

    const forceFail = new URLSearchParams(window.location.search).get("mock") === "bundle_fail";
    const ctx = { repId: currentRep.id, vanWarehouseId: vanId, date: todayStr() };
    const collected: Partial<Record<BundleStepKey, unknown>> = {};

    for (const step of BUNDLE_STEPS) {
      setStepStatus((prev) => ({ ...prev, [step.key]: "running" }));
      await new Promise((r) => setTimeout(r, 350));

      if (forceFail && step.key === "items") {
        setStepStatus((prev) => ({ ...prev, [step.key]: "error" }));
        setFailed(true);
        return; // stop — nothing persisted, no silent partial state
      }
      collected[step.key] = fetchBundleStepData(step.key, ctx);
      setStepStatus((prev) => ({ ...prev, [step.key]: "done" }));
    }

    const bundle = collected as unknown as VanBundle;
    await saveBundle(bundle);
    setBundleSize(estimateBundleSizeBytes(bundle));

    openVanShift({
      vanWarehouseId: vanId,
      repId: currentRep.id,
      routeId: route?.id ?? null,
      treasuryId: treasury?.id ?? "",
      openingFloat: parseFloat(openingFloat) || 0,
      note,
    });

    toast.success(t("shift_open.success_toast"));
    setTimeout(() => navigate("/van/today"), 500);
  }

  function handleSubmit() {
    if (!vanId) { toast.error(t("shift_open.error_van_required")); return; }
    if (!openingFloat || parseFloat(openingFloat) <= 0) { toast.error(t("shift_open.error_float_required")); return; }
    void runPrefetch();
  }

  if (vans.length === 0) {
    return (
      <div className="h-full overflow-auto p-4">
        <PageHeader title={t("shift_open.title")} />
        <EmptyState icon={LockKeyhole} title={t("shift_open.no_vans")} description="" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <PageHeader title={t("shift_open.title")} />

        <PageSection>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("shift_open.field_van")} *</label>
              <Select value={vanId} onValueChange={setVanId}>
                <SelectTrigger><SelectValue placeholder={t("shift_open.select_van")} /></SelectTrigger>
                <SelectContent>
                  {vans.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{lang === "ar" ? v.name_ar : v.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("shift_open.field_float")} *</label>
              <Input type="number" min={0} step="any" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("shift_open.field_treasury")}</label>
              <div className="h-10 px-3 flex items-center rounded border border-border bg-muted/30 text-sm text-muted-foreground">
                {treasury ? (lang === "ar" ? treasury.name_ar : treasury.name_en) : "—"}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("shift_open.field_note")}</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <Button className="w-full" onClick={handleSubmit}>{t("shift_open.submit")}</Button>
          </div>
        </PageSection>
      </div>

      <ModalShell
        open={progressOpen}
        onOpenChange={(o) => !o && setProgressOpen(false)}
        title={t("shift_open.progress_title")}
        description={!failed ? t("shift_open.progress_body") : undefined}
      >
        <div className="space-y-3">
          {failed && (
            <div className="rounded px-3 py-2 text-sm bg-danger-tint text-danger-text">
              {t("shift_open.error_body")}
            </div>
          )}
          <ul className="space-y-2">
            {BUNDLE_STEPS.map((step) => {
              const status = stepStatus[step.key] ?? "pending";
              return (
                <li key={step.key} className="flex items-center gap-2 text-sm">
                  {status === "done" && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                  {status === "running" && <Loader2 className="h-4 w-4 text-brand animate-spin shrink-0" />}
                  {status === "error" && <XCircle className="h-4 w-4 text-danger shrink-0" />}
                  {status === "pending" && <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                  <span className={cn(status === "pending" && "text-muted-foreground")}>{t(`shift_open.${step.labelKey}`)}</span>
                </li>
              );
            })}
          </ul>

          {bundleSize != null && (
            <p className="text-xs text-muted-foreground">{formatBytes(bundleSize)}</p>
          )}

          {failed && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setProgressOpen(false)}>{t("shift_open.close")}</Button>
              <Button onClick={() => void runPrefetch()}>{t("shift_open.retry")}</Button>
            </div>
          )}
        </div>
      </ModalShell>
    </div>
  );
}
