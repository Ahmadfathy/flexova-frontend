import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { formatMoney, formatDate } from "@/lib/format";
import type { Lang } from "@/stores/appearance";
import type { SvcSubscription } from "@/stores/svcSubscriptions";
import { clientName, findClient } from "./catalog";
import { isNearRenewal } from "./subscriptionsLogic";

const STATUS_PILL: Record<SvcSubscription["status"], PillVariant> = {
  active: "approved",
  past_due: "pending",
  suspended: "rejected",
  cancelled: "inactive",
};

interface SubscriptionCardProps {
  sub: SvcSubscription;
  lang: Lang;
  canManage: boolean;
  onSuspend: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}

export function SubscriptionCard({ sub, lang, canManage, onSuspend, onResume, onCancel, onRetry }: SubscriptionCardProps) {
  const { t } = useTranslation("svc");
  const client = findClient(sub.client_id);
  const nearRenewal = isNearRenewal(sub);

  return (
    <div className="rounded-lg border border-border bg-card p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{lang === "ar" ? sub.plan_ar : sub.plan_en}</p>
          <p className="text-xs text-muted-foreground">{clientName(client, lang)}</p>
        </div>
        <StatusPill variant={STATUS_PILL[sub.status]} label={t(`subscriptions.status.${sub.status}`)} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{t("subscriptions.cycle_label")}</p>
          <p className="font-medium text-foreground">{t(`subscriptions.cycle.${sub.cycle}`)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("subscriptions.renewal_date_label")}</p>
          <p className="font-medium text-foreground tabular-nums">{formatDate(sub.renewal_date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("subscriptions.amount_label")}</p>
          <p className="font-medium text-foreground tabular-nums">{formatMoney(sub.amount, lang)}</p>
        </div>
        {sub.status === "past_due" && sub.next_retry && (
          <div>
            <p className="text-xs text-muted-foreground">{t("subscriptions.next_retry_label")}</p>
            <p className="font-medium text-warning-text tabular-nums">{formatDate(sub.next_retry)}</p>
          </div>
        )}
      </div>

      {nearRenewal && (
        <div className="flex items-center gap-1.5 text-xs text-warning-text">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t("subscriptions.near_renewal_note")}
        </div>
      )}

      {sub.attempts.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          <p className="text-xs font-medium text-muted-foreground">{t("subscriptions.attempts_title")}</p>
          {sub.attempts.slice(0, 4).map((a, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="tabular-nums text-muted-foreground">{formatDate(a.date)}</span>
              <span className={a.result === "success" ? "text-success-text" : "text-danger-text"}>
                {a.result === "success" ? t("subscriptions.attempt_success") : (lang === "ar" ? a.reason_ar : a.reason_en) || t("subscriptions.attempt_failed")}
              </span>
              <span className="tabular-nums text-muted-foreground">{formatMoney(a.amount, lang)}</span>
            </div>
          ))}
        </div>
      )}

      {sub.status === "suspended" && sub.note && (
        <p className="text-xs text-muted-foreground">{sub.note}</p>
      )}

      {canManage && sub.status !== "cancelled" && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {sub.status === "past_due" && (
            <Button variant="solid" tone="warning" size="sm" className="h-9" onClick={() => onRetry(sub.id)}>
              {t("subscriptions.retry_action")}
            </Button>
          )}
          {sub.status === "suspended" && (
            <Button variant="solid" tone="success" size="sm" className="h-9" onClick={() => onResume(sub.id)}>
              {t("subscriptions.resume_action")}
            </Button>
          )}
          {(sub.status === "active" || sub.status === "past_due") && (
            <Button variant="outline" size="sm" className="h-9" onClick={() => onSuspend(sub.id)}>
              {t("subscriptions.suspend_action")}
            </Button>
          )}
          <Button variant="outline" tone="danger" size="sm" className="h-9" onClick={() => onCancel(sub.id)}>
            {t("subscriptions.cancel_action")}
          </Button>
        </div>
      )}
    </div>
  );
}
