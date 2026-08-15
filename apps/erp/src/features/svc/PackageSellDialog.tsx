import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField } from "@/components/patterns/FormLayout";
import { DatePicker } from "@/components/patterns/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TenderModal } from "@/features/pos/TenderModal";
import { usePosShift } from "@/stores/posShift";
import { usePosRegister } from "@/stores/posRegister";
import { useSvcPackages } from "@/stores/svcPackages";
import type { Lang } from "@/stores/appearance";
import { SERVICES, clientName, findClient, findService, serviceName } from "./catalog";
import { defaultPackageValidUntil } from "./subscriptionsLogic";
import { ClientPicker } from "./ClientPicker";

interface PackageSellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
}

export function PackageSellDialog({ open, onOpenChange, lang }: PackageSellDialogProps) {
  const { t } = useTranslation("svc");
  const sellPackage = useSvcPackages((s) => s.sellPackage);
  const recordSale = usePosShift((s) => s.recordSale);
  const setCustomer = usePosRegister((s) => s.setCustomer);

  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [totalSessions, setTotalSessions] = useState(5);
  const [validUntil, setValidUntil] = useState(defaultPackageValidUntil());
  const [pricePaid, setPricePaid] = useState(0);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [tenderOpen, setTenderOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientId("");
    setServiceId("");
    setTotalSessions(5);
    setValidUntil(defaultPackageValidUntil());
    setPricePaid(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const service = findService(serviceId);
  const client = findClient(clientId);
  const isValid = !!clientId && !!serviceId && totalSessions > 0 && pricePaid > 0;

  function handleServiceChange(id: string) {
    setServiceId(id);
    const svc = findService(id);
    if (svc) setPricePaid(Math.round(svc.price * totalSessions));
  }

  function handleSessionsChange(n: number) {
    setTotalSessions(n);
    if (service) setPricePaid(Math.round(service.price * n));
  }

  function handleSell() {
    if (!isValid) return;
    if (client) setCustomer({ id: client.id, type: "individual", name_ar: client.name_ar, name_en: client.name_en, credit_limit: 0, ar_balance: 0 });
    setTenderOpen(true);
  }

  function handleTenderSettle(result: { tenders: Record<string, number> }) {
    if (!service) return;
    recordSale(result.tenders, 0);
    sellPackage({
      client_id: clientId,
      name_ar: `باقة ${totalSessions} ${service.name_ar}`,
      name_en: `${totalSessions} ${service.name_en}`,
      service_id: serviceId,
      total_sessions: totalSessions,
      valid_until: validUntil,
      price_paid: pricePaid,
    });
    toast.success(t("subscriptions.package_sold_toast"));
    setTenderOpen(false);
    onOpenChange(false);
  }

  return (
    <>
      <ModalShell open={open} onOpenChange={onOpenChange} title={t("subscriptions.sell_package")} size="sm">
        <div className="space-y-4">
          <FormField label={t("appointment.client_label")} required>
            <Button variant="outline" className="w-full justify-start h-11" onClick={() => setClientPickerOpen(true)}>
              {client ? clientName(client, lang) : t("appointment.client_placeholder")}
            </Button>
          </FormField>

          <FormField label={t("appointment.services_label")} required>
            <Select value={serviceId} onValueChange={handleServiceChange}>
              <SelectTrigger className="h-11"><SelectValue placeholder={t("appointment.provider_placeholder")} /></SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => <SelectItem key={s.id} value={s.id}>{serviceName(s, lang)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label={t("subscriptions.total_sessions")} required>
            <Input type="number" min={1} step={1} value={totalSessions} onChange={(e) => handleSessionsChange(Math.max(1, parseInt(e.target.value, 10) || 1))} className="h-11 tabular-nums" />
          </FormField>

          <FormField label={t("subscriptions.valid_until")} required>
            <DatePicker value={validUntil} onChange={setValidUntil} />
          </FormField>

          <FormField label={t("subscriptions.price_paid")} required>
            <Input type="number" min={0} step={1} value={pricePaid} onChange={(e) => setPricePaid(Math.max(0, parseFloat(e.target.value) || 0))} className="h-11 tabular-nums" />
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

      <TenderModal open={tenderOpen} onOpenChange={(o) => !o && setTenderOpen(false)} grandTotal={pricePaid} tax={0} onSettle={handleTenderSettle} />
    </>
  );
}
