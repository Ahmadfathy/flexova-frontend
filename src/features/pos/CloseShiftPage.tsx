import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { StatusPill } from "@/components/patterns/StatusPill";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePosShift, expectedCashOf } from "@/stores/posShift";
import { tenderName } from "./tenderTypes";

const VARIANCE_VARIANT = {
  balanced: "approved",
  short: "rejected",
  over: "pending",
} as const;

export default function CloseShiftPage() {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();

  const shift = usePosShift();
  const buildCloseSummary = usePosShift(s => s.buildCloseSummary);
  const closeShift = usePosShift(s => s.closeShift);

  const [counted, setCounted] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(false);

  const expectedCash = expectedCashOf(shift);
  const countedNum = parseFloat(counted) || 0;
  const hasCounted = counted.trim() !== "";
  const variance = countedNum - expectedCash;
  const varianceState: "balanced" | "short" | "over" = variance === 0 ? "balanced" : variance < 0 ? "short" : "over";
  const tenderEntries = Object.entries(shift.byTender).filter(([, amount]) => amount > 0);

  const canClose = can("pos.shift.close") && hasCounted;

  async function handleConfirmClose() {
    if (!hasCounted) return;
    const mock = new URLSearchParams(window.location.search).get("mock");

    setPosting(true);
    setPostError(false);

    if (mock === "loading") return; // stays posting forever — demonstrates the loading state

    await new Promise(r => setTimeout(r, 700));

    if (mock === "error") {
      setPosting(false);
      setPostError(true);
      return;
    }

    setPosting(false);
    setConfirmOpen(false);
    closeShift(buildCloseSummary(countedNum, navigator.onLine));
    navigate("/pos/register");
  }

  return (
    <div className="max-w-lg w-full mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <FileCheck2 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-base font-semibold text-foreground">{t("shift.close")}</h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-y-1.5">
          <span className="text-muted-foreground">{t("shift.cashier")}</span>
          <span className="text-end font-medium">{lang === "ar" ? shift.cashierAr : shift.cashierEn}</span>
          <span className="text-muted-foreground">{t("shift.opening_float")}</span>
          <span className="text-end tabular-nums">{formatMoney(shift.openingFloat, lang)}</span>
          <span className="text-muted-foreground">{t("shift.sales_count")}</span>
          <span className="text-end tabular-nums">{shift.salesCount}</span>
        </div>

        <div className="border-t border-border pt-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("shift.by_tender")}</p>
          {tenderEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            tenderEntries.map(([id, amount]) => (
              <div key={id} className="flex items-center justify-between">
                <span>{tenderName(id, lang)}</span>
                <span className="tabular-nums">{formatMoney(amount, lang)}</span>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border pt-2 flex items-center justify-between font-semibold">
          <span>{t("shift.expected")}</span>
          <span className="tabular-nums">{formatMoney(expectedCash, lang)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="counted-cash">{t("shift.counted")}</Label>
          <Input
            id="counted-cash"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            autoFocus
            placeholder={t("shift.counted_placeholder")}
            value={counted}
            onChange={e => setCounted(e.target.value)}
            className="h-12 text-lg tabular-nums"
          />
        </div>

        {hasCounted && (
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="text-muted-foreground">{t("shift.variance")}</span>
            <StatusPill
              variant={VARIANCE_VARIANT[varianceState]}
              label={`${t(`shift.${varianceState}`)} · ${formatMoney(variance, lang)}`}
            />
          </div>
        )}
      </div>

      <Button
        variant="solid"
        tone="primary"
        size="lg"
        className="w-full h-12"
        disabled={!canClose}
        onClick={() => setConfirmOpen(true)}
      >
        {t("shift.close")}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => { if (!posting) setConfirmOpen(o); }}
        title={t("shift.close_confirm_title")}
        description={t("shift.close_confirm_body")}
        confirmTone="warning"
        confirmLabel={t("shift.close")}
        loading={posting}
        onConfirm={handleConfirmClose}
      >
        {postError && (
          <p className="text-sm text-danger-text">
            {t("shift.posting_error_title")} — {t("shift.posting_error_body")}
          </p>
        )}
        {posting && !postError && (
          <p className="text-sm text-muted-foreground">{t("shift.posting")}</p>
        )}
      </ConfirmDialog>
    </div>
  );
}
