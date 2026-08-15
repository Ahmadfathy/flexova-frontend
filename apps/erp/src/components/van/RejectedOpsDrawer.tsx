import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { DrawerShell } from "@/components/patterns/DrawerShell";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/stores/appearance";
import { useWholesaleSyncQueue } from "@/stores/wholesaleSyncQueue";
import { formatDate, formatTime } from "@/lib/format";

interface RejectedOpsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "عمليات مرفوضة" drawer (FE_13 §15) — plain-Arabic reason + a fix/retry
 * action per rejected op. Retrying re-runs the same conflict-policy check;
 * if the underlying issue is gone the op moves to "synced". */
export function RejectedOpsDrawer({ open, onOpenChange }: RejectedOpsDrawerProps) {
  const { t } = useTranslation("van");
  const { lang } = useAppearance();
  const entries = useWholesaleSyncQueue((s) => s.entries);
  const retryOp = useWholesaleSyncQueue((s) => s.retryOp);

  const rejected = entries.filter((e) => e.status === "rejected");

  const opLabel: Record<string, string> = {
    sale: t("rejected_ops.op_sale"),
    collection: t("rejected_ops.op_collection"),
    visit_update: t("rejected_ops.op_visit_update"),
    return: t("rejected_ops.op_return"),
  };

  return (
    <DrawerShell open={open} onOpenChange={onOpenChange} title={t("rejected_ops.title")} size="md">
      {rejected.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={t("rejected_ops.empty")} description="" />
      ) : (
        <div className="space-y-3">
          {rejected.map((op) => (
            <div key={op.id} className="rounded border border-danger/30 bg-danger-tint p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-danger-text">{opLabel[op.op] ?? op.op}</span>
                <span className="text-[11px] font-mono text-muted-foreground" dir="ltr">{op.number}</span>
              </div>
              <p className="text-sm text-danger-text">{lang === "ar" ? op.reason_ar : op.reason_en}</p>
              <p className="text-xs text-muted-foreground">{formatDate(op.created_at)} · {formatTime(op.created_at)}</p>
              <Button variant="outline" size="sm" onClick={() => void retryOp(op.id)}>
                <RefreshCw className="h-3.5 w-3.5 me-1.5" />
                {t("rejected_ops.fix_action")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </DrawerShell>
  );
}
