import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { TenderModal } from "@/features/pos/TenderModal";
import { usePosShift } from "@/stores/posShift";
import { usePosRegister } from "@/stores/posRegister";
import { useSvcSubscriptions } from "@/stores/svcSubscriptions";
import type { Lang } from "@/stores/appearance";
import { clientName, findClient } from "./catalog";
import { SELLABLE_PLANS } from "./subscriptionsLogic";
import { ClientPicker } from "./ClientPicker";

interface SubscriptionSellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
}

export function SubscriptionSellDialog({ open, onOpenChange, lang }: SubscriptionSellDialogProps) {
  const { t } = useTranslation("svc");
  const sellSubscription = useSvcSubscriptions((s) => s.sellSubscription);
  const recordSale = usePosShift((s) => s.recordSale);
  const setCustomer = usePosRegister((s) => s.setCustomer);

  const [clientId, setClientId] = useState("");
  const [planKey, setPlanKey] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [tenderOpen, setTenderOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientId("");
    setPlanKey("");
  }, [open]);

  const client = findClient(clientId);
  const plan = SELLABLE_PLANS.find((p) => p.key === planKey);
  const isValid = !!clientId && !!plan;

  function handleSell() {
    if (!isValid || !plan) return;
    if (client) setCustomer({ id: client.id, type: "individual", name_ar: client.name_ar, name_en: client.name_en, credit_limit: 0, ar_balance: 0 });
    setTenderOpen(true);
  }

  function handleTenderSettle(result: { tenders: Record<string, number> }) {
    if (!plan) return;
    recordSale(result.tenders, 0);
    sellSubscription({ client_id: clientId, plan_ar: plan.plan_ar, plan_en: plan.plan_en, cycle: plan.cycle, amount: plan.amount });
    toast.success(t("subscriptions.subscription_activated_toast"));
    setTenderOpen(false);
    onOpenChange(false);
  }

  return (
    <>
      <ModalShell open={open} onOpenChange={onOpenChange} title={t("subscriptions.sell_subscription")} size="sm">
        <div className="space-y-4">
          <FormField label={t("appointment.client_label")} required>
            <Button variant="outline" className="w-full justify-start h-11" onClick={() => setClientPickerOpen(true)}>
              {client ? clientName(client, lang) : t("appointment.client_placeholder")}
            </Button>
          </FormField>

          <FormField label={t("subscriptions.plan_label")} required>
            <Select value={planKey} onValueChange={setPlanKey}>
              <SelectTrigger className="h-11"><SelectValue placeholder={t("subscriptions.plan_placeholder")} /></SelectTrigger>
              <SelectContent>
                {SELLABLE_PLANS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {lang === "ar" ? p.plan_ar : p.plan_en} · {t(`subscriptions.cycle.${p.cycle}`)} · {formatMoney(p.amount, lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <Button variant="solid" tone="primary" className="w-full h-12" disabled={!isValid} onClick={handleSell}>
            {t("subscriptions.sell_action")}
          </Button>
        </div>
      </ModalShell>

      <ClientPicker
        open={clientPickerOpen}
        onOpenChange={setClientPickerOpen}
        lang={lang}
        allowWalkIn={false}
        onPickClient={setClientId}
      />

      <TenderModal open={tenderOpen} onOpenChange={(o) => !o && setTenderOpen(false)} grandTotal={plan?.amount ?? 0} tax={0} onSettle={handleTenderSettle} />
    </>
  );
}
