import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Phone, MessageCircle, Clock } from "lucide-react";

import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { formatMoney, formatDate } from "@/lib/format";
import { getCreditSnapshot, creditTone } from "@/lib/wholesale/credit";
import type { WholesaleCustomer, CreditReservation, VisitStatus, NoOrderReason } from "@/types/wholesale";

const STATUS_PILL: Record<VisitStatus, PillVariant> = {
  scheduled: "default",
  sold: "approved",
  no_order: "pending",
  closed: "inactive",
  deferred: "pending",
};

const CREDIT_TEXT_TONE: Record<"success" | "warning" | "danger", string> = {
  success: "text-success-text",
  warning: "text-warning-text",
  danger: "text-danger-text",
};

export interface VisitCardProps {
  visit: {
    id: string;
    status: VisitStatus;
    sequence: number;
  };
  customer: WholesaleCustomer | undefined;
  reservations: CreditReservation[];
  /** Date of this customer's last completed visit, if any. */
  lastVisitDate?: string | null;
  noOrderReasons: NoOrderReason[];
  lang: "ar" | "en";
  onStart?: () => void;
  onDefer?: (reasonId: string) => void;
  className?: string;
}

/** Day-plan visit card (FE_13 §2.3) — all five visit statuses + their pill tones. */
export function VisitCard({
  visit, customer, reservations, lastVisitDate, noOrderReasons, lang, onStart, onDefer, className,
}: VisitCardProps) {
  const { t } = useTranslation("van");
  const [deferring, setDeferring] = useState(false);
  const [reason, setReason] = useState("");

  const name = customer ? (lang === "ar" ? customer.name_ar : customer.name_en) : "—";
  const address = customer?.address_ar ?? "";
  const snapshot = customer ? getCreditSnapshot(customer, reservations) : null;
  const tone = snapshot ? creditTone(snapshot) : "success";

  const canStart = visit.status === "scheduled" || visit.status === "deferred";

  function confirmDefer() {
    if (!reason) return;
    onDefer?.(reason);
    setDeferring(false);
    setReason("");
  }

  return (
    <div className={cn("rounded border border-border bg-card p-3 space-y-2.5", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          {address && <p className="text-xs text-muted-foreground truncate">{address}</p>}
        </div>
        <StatusPill variant={STATUS_PILL[visit.status]} label={t(`visit_status.${visit.status}`)} />
      </div>

      {snapshot && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            {t("visit_card.owed")} <span className="tabular-nums font-medium text-foreground">{formatMoney(snapshot.used, lang)}</span>
          </span>
          <span className={cn("font-medium", CREDIT_TEXT_TONE[tone])}>
            {t("visit_card.available")} <span className="tabular-nums">{formatMoney(snapshot.available, lang)}</span>
          </span>
        </div>
      )}

      {lastVisitDate && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          {t("visit_card.last_visit")} {formatDate(lastVisitDate)}
        </p>
      )}

      {deferring ? (
        <div className="flex items-center gap-2 pt-1">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder={t("visit_card.defer_reason_placeholder")} /></SelectTrigger>
            <SelectContent>
              {noOrderReasons.map((r) => (
                <SelectItem key={r.id} value={r.id}>{lang === "ar" ? r.name_ar : r.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" disabled={!reason} onClick={confirmDefer}>{t("visit_card.confirm")}</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setDeferring(false)}>{t("visit_card.cancel")}</Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 pt-1">
          {canStart && (
            <Button size="sm" className="h-8 flex-1" onClick={onStart}>{t("visit_card.start_visit")}</Button>
          )}
          {customer?.phone && (
            <>
              <Button asChild size="icon" variant="outline" className="h-8 w-8 shrink-0">
                <a href={`tel:${customer.phone}`} aria-label={t("visit_card.call")}><Phone className="h-3.5 w-3.5" /></a>
              </Button>
              <Button asChild size="icon" variant="outline" className="h-8 w-8 shrink-0">
                <a href={`https://wa.me/${customer.phone.replace(/^0/, "20")}`} target="_blank" rel="noreferrer" aria-label={t("visit_card.whatsapp")}>
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </Button>
            </>
          )}
          {canStart && (
            <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => setDeferring(true)}>
              {t("visit_card.defer")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
