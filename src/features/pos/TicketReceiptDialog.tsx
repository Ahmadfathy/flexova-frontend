import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Clock, Printer, QrCode, ExternalLink, RefreshCw, Ban } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { StatusPill } from "@/components/patterns/StatusPill";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate, formatTime } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { tenderName } from "./tenderTypes";
import { paymentPillVariant, paymentStatusKey, syncPillVariant } from "./journalStatus";
import type { PosTicket } from "./useTerminalJournal";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";
import permissionsFixtures from "@/lib/mock/fixtures/permissions.fixtures.json";
import salesFixtures from "@/lib/mock/fixtures/sales.fixtures.json";

const TERMINALS = posFixtures.terminals;
const BRANCHES = permissionsFixtures.branches;
const CUSTOMERS = salesFixtures.customers as {
  id: string; name_ar: string; name_en: string; trn: string | null;
}[];
const SELLER_TRN = salesFixtures.eta_settings.trn;

interface TicketReceiptDialogProps {
  ticket: PosTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOffline: boolean;
}

export function TicketReceiptDialog({ ticket, open, onOpenChange, isOffline }: TicketReceiptDialogProps) {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();
  const [resending, setResending] = useState(false);

  if (!ticket) return null;

  const terminal = TERMINALS.find(tm => tm.id === ticket.terminal_id);
  const branch = BRANCHES.find(b => b.id === ticket.branch_id);
  const customer = CUSTOMERS.find(c => c.id === ticket.customer_id);
  const isB2B = ticket.channel === "e-invoice";
  const isRejected = ticket.sync_status === "rejected";
  const isQueued = ticket.sync_status === "queued";
  const isValid = ticket.sync_status === "valid";
  const isVoided = ticket.status === "voided";
  const canResend = (isRejected || isQueued) && can("sales.eta.resend");

  const handleResend = async () => {
    setResending(true);
    await new Promise(r => setTimeout(r, 700));
    setResending(false);
    toast.success(t("journal.resend_toast", { number: ticket.number }));
  };

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={<span dir="ltr">{ticket.number}</span>}
      description={`${formatDate(ticket.opened_at)} · ${formatTime(ticket.opened_at)}`}
      size="md"
      footer={
        <>
          {canResend && (
            <Button
              variant="outline"
              disabled={resending || isOffline}
              onClick={handleResend}
            >
              <RefreshCw className="h-4 w-4 me-1.5" />
              {t("journal.resend")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate("/sales/eta-hub")}
          >
            <ExternalLink className="h-4 w-4 me-1.5" />
            {t("journal.view_eta_hub")}
          </Button>
          <Button onClick={() => toast.info(t("receipt.print_toast"))}>
            <Printer className="h-4 w-4 me-1.5" />
            {t("receipt.print")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Independent status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill
            variant={paymentPillVariant(ticket)}
            label={t(`ticket.status.${paymentStatusKey(ticket)}`)}
          />
          <StatusPill
            variant={syncPillVariant(ticket.sync_status)}
            label={t(`ticket.status.${ticket.sync_status}`)}
          />
        </div>

        {/* Rejected — plain-Arabic reason + offending field */}
        {isRejected && ticket.eta && (
          <div className="flex items-start gap-3 px-4 py-3 bg-danger-tint text-danger-text rounded border border-danger/20">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold text-sm">{t("journal.rejected_reason")}</p>
              <p className="text-sm">{lang === "ar" ? ticket.eta.reason_ar : ticket.eta.reason_en}</p>
              {ticket.eta.offending_field && (
                <p className="text-xs font-mono opacity-80" dir="ltr">
                  {t("journal.offending_field")}: {ticket.eta.offending_field}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Queued nearing window */}
        {isQueued && ticket.eta?.window_remaining_hours !== undefined && (
          <div className="flex items-center gap-2 px-4 py-2 bg-warning-tint text-warning-text rounded border border-warning/20">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {t("journal.nearing_window", { h: ticket.eta.window_remaining_hours })}
            </span>
          </div>
        )}

        {/* Voided note */}
        {isVoided && (
          <div className="flex items-start gap-3 px-4 py-3 bg-muted text-muted-foreground rounded border border-border">
            <Ban className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-0.5 text-sm">
              {ticket.void_reason_ar && <p>{ticket.void_reason_ar}</p>}
              {ticket.voided_by_ar && <p className="text-xs">{ticket.voided_by_ar}</p>}
            </div>
          </div>
        )}

        {/* 80mm-styled receipt preview */}
        <div className="mx-auto w-full max-w-[300px] rounded border border-border bg-card p-4 text-xs font-mono space-y-2">
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm">{branch ? (lang === "ar" ? branch.name_ar : branch.name_en) : ticket.branch_id}</p>
            <p dir="ltr">{t("receipt.seller_trn")}: {SELLER_TRN}</p>
            {isB2B && customer?.trn && (
              <p dir="ltr">{t("receipt.buyer_trn")}: {customer.trn || "—"}</p>
            )}
            <p dir="ltr">{ticket.number}</p>
            <p>{terminal ? (lang === "ar" ? terminal.name_ar : terminal.name_en) : ticket.terminal_id}</p>
          </div>

          <div className="border-t border-dashed border-border pt-2 space-y-1">
            {ticket.lines.length === 0 ? (
              <p className="text-center text-muted-foreground">{t("receipt.no_lines")}</p>
            ) : (
              ticket.lines.map((line, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{line.description}</span>
                  <span className="tabular-nums shrink-0">
                    {line.qty ?? line.weight_kg} × {formatMoney(line.price ?? line.price_per_kg ?? 0, lang)} = {formatMoney(line.line_total, lang)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-dashed border-border pt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span>{t("subtotal")}</span>
              <span className="tabular-nums">{formatMoney(ticket.totals.subtotal, lang)}</span>
            </div>
            {ticket.totals.line_discounts > 0 && (
              <div className="flex items-center justify-between">
                <span>{t("discount")}</span>
                <span className="tabular-nums">-{formatMoney(ticket.totals.line_discounts, lang)}</span>
              </div>
            )}
            {ticket.totals.ticket_discount > 0 && (
              <div className="flex items-center justify-between">
                <span>{t("ticket.discount")}</span>
                <span className="tabular-nums">-{formatMoney(ticket.totals.ticket_discount, lang)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>{t("tax_total")}</span>
              <span className="tabular-nums">{formatMoney(ticket.totals.tax, lang)}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-sm pt-1 border-t border-dashed border-border">
              <span>{t("layout.grand_total")}</span>
              <span className="tabular-nums">{formatMoney(ticket.totals.grand_total, lang)}</span>
            </div>
          </div>

          {ticket.tenders.length > 0 && (
            <div className="border-t border-dashed border-border pt-2 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("receipt.tenders")}</p>
              {ticket.tenders.map((td, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span>{tenderName(td.type, lang)}</span>
                  <span className="tabular-nums">{formatMoney(td.amount, lang)}</span>
                </div>
              ))}
              {ticket.change_due > 0 && (
                <div className="flex items-center justify-between">
                  <span>{t("receipt.change_due")}</span>
                  <span className="tabular-nums">{formatMoney(ticket.change_due, lang)}</span>
                </div>
              )}
            </div>
          )}

          {!!ticket.loyalty_earned && (
            <div className="flex items-center justify-between border-t border-dashed border-border pt-2">
              <span>{t("receipt.loyalty_earned")}</span>
              <span className="tabular-nums">+{ticket.loyalty_earned}</span>
            </div>
          )}

          {isValid && ticket.eta?.uuid && (
            <div className="border-t border-dashed border-border pt-2 space-y-1 text-center">
              <p className="break-all" dir="ltr">{t("receipt.uuid")}: {ticket.eta.uuid}</p>
              {ticket.eta.qr && (
                <a
                  href={ticket.eta.qr}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-text"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {t("receipt.qr")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
