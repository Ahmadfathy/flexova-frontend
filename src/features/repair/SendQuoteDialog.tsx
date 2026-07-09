import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Phone, User } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { Lang } from "@/stores/appearance";
import { useRprSettings } from "@/stores/rprSettings";
import { deviceLabel, type RprApprovalChannel, type RprWorkOrder } from "./catalog";

interface SendQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  workOrder: RprWorkOrder;
  onSend: (channel: RprApprovalChannel) => void;
}

const CHANNELS: { value: RprApprovalChannel; icon: typeof MessageCircle }[] = [
  { value: "whatsapp", icon: MessageCircle },
  { value: "phone", icon: Phone },
  { value: "in_person", icon: User },
];

/** Channel picker for "send for approval" — WhatsApp shows a prefilled template preview
 * (no real send API in this codebase, matches every other module's simulated-send depth). */
export function SendQuoteDialog({ open, onOpenChange, lang, workOrder, onSend }: SendQuoteDialogProps) {
  const { t } = useTranslation("repair");
  const [channel, setChannel] = useState<RprApprovalChannel>("whatsapp");
  const approvalTemplate = useRprSettings((s) => s.whatsappApprovalTemplate);

  const total = workOrder.quote?.total ?? 0;
  const template = approvalTemplate
    .replace("{device}", deviceLabel(workOrder.device) || workOrder.device.type)
    .replace("{wo}", workOrder.number)
    .replace("{total}", formatMoney(total, lang));

  function handleSend() {
    onSend(channel);
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("wo.send_approval")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("intake.cancel")}</Button>
          <Button onClick={handleSend} className={channel === "whatsapp" ? "gap-1.5 bg-green-600 hover:bg-green-700 text-white" : "gap-1.5"}>
            {t("wo.send_approval")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {CHANNELS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setChannel(value)}
              className={
                "flex flex-col items-center gap-1.5 rounded border-2 px-2 py-3 text-xs font-medium transition-colors " +
                (channel === value ? "border-brand bg-brand-tint text-brand-text" : "border-foreground/15 text-muted-foreground hover:border-foreground/30")
              }
            >
              <Icon className="h-4 w-4" />
              {t(`wo.channel_${value}`)}
            </button>
          ))}
        </div>

        {channel === "whatsapp" && (
          <div className="rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm">
            {template}
          </div>
        )}

        <div className="flex items-center justify-between text-sm pt-1 border-t border-border">
          <span className="text-muted-foreground">{t("wo.quote")}</span>
          <span className="tabular-nums font-semibold">{formatMoney(total, lang)}</span>
        </div>
      </div>
    </ModalShell>
  );
}
