import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Flag } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Lang } from "@/stores/appearance";
import { usePosShift } from "@/stores/posShift";
import { usePosRegister } from "@/stores/posRegister";
import { useRprWorkOrders } from "@/stores/rprWorkOrders";
import { TenderModal } from "@/features/pos/TenderModal";
import {
  findCustomer, findPart, findTechnician, technicianName,
  buildFinalDocLines, computeReleaseJournal, isPeriodClosed, openPeriodLabel, round2,
  type RprWorkOrder, type RprFinalDocument, type RprTender,
} from "./catalog";
import { computeCommission } from "./commission";
import { computeEtaStatus, docTypeFor } from "./releaseEta";

interface ReleaseWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  workOrder: RprWorkOrder;
}

/** Deliver + invoice (FE_12 §6) — generates the frozen final document, subtracts the deposit,
 * reuses `TenderModal` AS-IS for payment (cash/mixed/credit/vouchers/loyalty — every method it
 * already supports, not cherry-picked), shows a genuinely-balanced auto-posting preview (no real
 * ledger exists anywhere in this codebase to post to — see catalog.ts's `computeReleaseJournal`
 * doc comment) and the technician commission estimate, then calls `deliverWorkOrder` which
 * freezes the document and starts the warranty window. */
export function ReleaseWorkOrderDialog({ open, onOpenChange, lang, workOrder: wo }: ReleaseWorkOrderDialogProps) {
  const { t } = useTranslation("repair");
  const deliverWorkOrder = useRprWorkOrders((s) => s.deliverWorkOrder);
  const recordSale = usePosShift((s) => s.recordSale);
  const setPosCustomer = usePosRegister((s) => s.setCustomer);

  const [tenderOpen, setTenderOpen] = useState(false);

  const mockParam = useMemo(() => new URLSearchParams(window.location.search).get("mock"), []);
  const forceRejectEta = mockParam === "eta_reject";
  const forceClosedPeriod = mockParam === "closed_period";

  const customer = findCustomer(wo.customer_id);
  const hasTrn = !!customer?.trn;
  const docType = docTypeFor(hasTrn);

  const lines = useMemo(() => buildFinalDocLines(wo), [wo]);
  const partsTotal = round2(wo.part_lines.reduce((s, l) => s + l.qty * l.price, 0));
  const serviceTotal = round2(wo.labor_lines.reduce((s, l) => s + l.price, 0));
  const partsCost = round2(wo.part_lines.reduce((s, l) => {
    const part = findPart(l.part_id);
    return s + (part ? part.cost * l.qty : 0);
  }, 0));
  const depositApplied = round2(Math.min(wo.deposit?.amount ?? 0, partsTotal + serviceTotal));
  const netDue = round2(Math.max(0, partsTotal + serviceTotal - depositApplied));

  const commission = computeCommission(wo.labor_lines);
  const journal = computeReleaseJournal({ partsTotal, serviceTotal, partsCost, depositApplied, netDue });
  const today = new Date().toISOString().slice(0, 10);
  const periodClosed = forceClosedPeriod || isPeriodClosed(today);
  const openLabel = openPeriodLabel();

  function buildDoc(tenders: RprTender[], paymentStatus: "paid" | "credit"): RprFinalDocument {
    const sim = computeEtaStatus(lines, navigator.onLine, forceRejectEta);
    return {
      id: `doc_rpr_${Date.now()}`,
      wo_id: wo.id,
      customer_id: wo.customer_id,
      type: docType,
      lines,
      parts_total: partsTotal,
      service_total: serviceTotal,
      deposit_applied: depositApplied,
      net_due: netDue,
      payment_status: paymentStatus === "credit" ? "unpaid" : "paid",
      eta_status: sim,
      tender: tenders,
      posted: true,
      issued_at: today,
      commission,
      journal: journal.lines,
    };
  }

  function finalize(tenders: RprTender[], paymentStatus: "paid" | "credit") {
    const doc = buildDoc(tenders, paymentStatus);
    if (tenders.length > 0) {
      recordSale(Object.fromEntries(tenders.map((td) => [td.method, td.amount])), 0);
    }
    deliverWorkOrder(wo.id, doc);
    toast.success(t("release.delivered_toast", { number: wo.number }));
    if (doc.eta_status === "flagged_missing_code") toast.warning(t("release.eta_flagged_toast"));
    else if (doc.eta_status === "queued") toast.info(t("release.eta_queued_toast"));
    if (commission.length > 0) toast.info(t("release.commission_posted_toast"));
    onOpenChange(false);
  }

  function handleConfirmZeroDue() {
    if (periodClosed) return;
    finalize([], "paid");
  }

  function handleOpenTender() {
    if (periodClosed) return;
    if (customer) {
      setPosCustomer({
        id: customer.id, type: customer.type,
        name_ar: customer.name_ar, name_en: customer.name_en,
        credit_limit: 0, ar_balance: 0,
      });
    } else {
      setPosCustomer(null);
    }
    setTenderOpen(true);
  }

  function handleTenderSettle(result: { tenders: Record<string, number>; paymentStatus: "paid" | "credit" }) {
    const tenders: RprTender[] = Object.entries(result.tenders).map(([method, amount]) => ({ method, amount }));
    finalize(tenders, result.paymentStatus);
    setTenderOpen(false);
  }

  return (
    <>
      <ModalShell
        open={open}
        onOpenChange={onOpenChange}
        title={t("release.title")}
        size="lg"
        footer={
          periodClosed ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("intake.cancel")}</Button>
          ) : netDue <= 0 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("intake.cancel")}</Button>
              <Button onClick={handleConfirmZeroDue}>{t("release.confirm_delivery")}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("intake.cancel")}</Button>
              <Button onClick={handleOpenTender}>{t("release.proceed_payment")}</Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          {periodClosed && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-danger-tint text-danger-text rounded border border-danger/20 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {t("release.period_closed")}
                {openLabel && ` — ${t("release.period_closed_suggest", { period: openLabel })}`}
              </span>
            </div>
          )}

          {/* Document preview */}
          <div className="rounded border border-border divide-y divide-border overflow-hidden">
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">{t("wo.no_lines")}</p>
            ) : (
              lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground flex items-center gap-1.5">
                    {line.name_ar}
                    {line._flag === "no_eta_code" && <Flag className="h-3 w-3 text-warning shrink-0" />}
                  </span>
                  <span className="tabular-nums text-sm font-medium">{formatMoney(line.qty * line.price, lang)}</span>
                </div>
              ))
            )}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("release.parts_total")}</span>
              <span className="tabular-nums">{formatMoney(partsTotal, lang)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("release.service_total")}</span>
              <span className="tabular-nums">{formatMoney(serviceTotal, lang)}</span>
            </div>
            {depositApplied > 0 && (
              <div className="flex items-center justify-between text-success-text">
                <span>{t("release.less_deposit")}</span>
                <span className="tabular-nums">-{formatMoney(depositApplied, lang)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5 border-t border-border font-semibold text-base">
              <span className="text-foreground">{t("release.net")}</span>
              <span className="tabular-nums">{formatMoney(netDue, lang)}</span>
            </div>
          </div>

          {lines.some((l) => l._flag === "no_eta_code") && (
            <p className="text-xs text-warning-text flex items-center gap-1">
              <Flag className="h-3 w-3" /> {t("release.eta_flagged")}
            </p>
          )}

          {/* Auto-posting preview */}
          <div className="rounded border border-border p-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("release.posting_preview")}</p>
            <div className="space-y-1">
              {journal.lines.map((jl, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{lang === "ar" ? jl.account_ar : jl.account_en}</span>
                  <span className="tabular-nums font-mono">
                    {jl.debit > 0 ? formatMoney(jl.debit, lang) : ""}
                    {jl.credit > 0 ? ` / ${formatMoney(jl.credit, lang)}` : ""}
                  </span>
                </div>
              ))}
            </div>
            <p className={cn("text-xs flex items-center gap-1 pt-1", journal.balanced ? "text-success-text" : "text-danger-text")}>
              <CheckCircle2 className="h-3 w-3" /> {t(journal.balanced ? "release.balanced" : "release.unbalanced")}
            </p>
          </div>

          {/* Commission preview */}
          {commission.length > 0 && (
            <div className="rounded border border-border p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("release.commission_preview")}</p>
              {commission.map((c, i) => {
                const tech = findTechnician(c.technician_id);
                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{tech ? technicianName(tech, lang) : c.technician_id}</span>
                    <span className="tabular-nums">{formatMoney(c.amount, lang)}</span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {docType === "e_invoice" ? t("release.channel_b2b") : t("release.channel_b2c")}
          </p>
        </div>
      </ModalShell>

      <TenderModal
        open={tenderOpen}
        onOpenChange={setTenderOpen}
        grandTotal={netDue}
        tax={0}
        onSettle={handleTenderSettle}
      />
    </>
  );
}
