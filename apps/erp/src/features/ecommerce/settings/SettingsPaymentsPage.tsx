import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CreditCard, Truck, Plus, X, CheckCircle2, Receipt } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useEcommerceSettings } from "@/stores/ecommerceSettings";
import { useEcommerceOrders } from "@/stores/ecommerceOrders";
import { useMockState } from "../useMockState";
import type { GatewayId } from "../types";

const GATEWAY_ICON: Record<GatewayId, typeof CreditCard> = { paymob: CreditCard, fawry: CreditCard, cod: Truck };

/** spec §7 — payments (gateway abstraction: a data-driven list, adding one
 * is a new config entry, not a bespoke component) + shipping (zones, cost
 * per zone, carriers as a list field). One route, two tabs. */
export function SettingsPaymentsPage() {
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const can = useCan();
  const canManage = can("ecommerce.settings.manage");

  const { loading, error, isOffline, reload } = useMockState();
  const gateways = useEcommerceSettings((s) => s.gateways);
  const toggleGateway = useEcommerceSettings((s) => s.toggleGateway);
  const zones = useEcommerceSettings((s) => s.shippingZones);
  const addZone = useEcommerceSettings((s) => s.addShippingZone);
  const updateZone = useEcommerceSettings((s) => s.updateShippingZone);
  const removeZone = useEcommerceSettings((s) => s.removeShippingZone);
  const carriers = useEcommerceSettings((s) => s.carriers);
  const addCarrier = useEcommerceSettings((s) => s.addCarrier);
  const removeCarrier = useEcommerceSettings((s) => s.removeCarrier);
  const orders = useEcommerceOrders((s) => s.orders);

  const [zoneName, setZoneName] = useState("");
  const [zoneCost, setZoneCost] = useState("");
  const [carrierDraft, setCarrierDraft] = useState("");

  // spec §7 "transaction log (READ from Accounting)" — this mock fixture
  // has no separate Accounting transactions collection, so the honest READ
  // here is the same paid orders Accounting would show as postings, not a
  // fabricated unrelated dataset.
  const transactions = Object.values(orders)
    .filter((o) => o.payment_status === "paid")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  function handleToggleGateway(id: GatewayId) {
    toggleGateway(id);
    toast.success(t("settings.gateway_toggled_toast"));
  }

  function handleAddZone() {
    const cost = Number(zoneCost);
    if (!zoneName.trim() || !(cost >= 0)) return;
    addZone({ name_ar: zoneName.trim(), cost });
    setZoneName(""); setZoneCost("");
    toast.success(t("settings.zone_added_toast"));
  }

  function handleAddCarrier() {
    if (!carrierDraft.trim()) return;
    addCarrier(carrierDraft.trim());
    setCarrierDraft("");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("settings.payments_title")} />
        <div className="px-4 space-y-4">
          <PageSection>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          </PageSection>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("settings.payments_title")} />
        <div className="px-4"><PageSection><ErrorState description={t("settings.error_body")} onRetry={reload} /></PageSection></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={t("settings.payments_title")} />

      {isOffline && <div className="px-4"><OfflineBanner message={t("settings.offline_note")} /></div>}

      <div className="px-4">
        <Tabs defaultValue="payments">
          <TabsList className="mb-4">
            <TabsTrigger value="payments">{t("settings.tab_payments")}</TabsTrigger>
            <TabsTrigger value="shipping">{t("settings.tab_shipping")}</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <PageSection title={t("settings.gateways_title")} subtitle={t("settings.gateways_sub")}>
              <div className="divide-y divide-border">
                {gateways.map((g) => {
                  const Icon = GATEWAY_ICON[g.id];
                  return (
                    <div key={g.id} className="flex items-center gap-3 py-3">
                      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{t(`settings.gateway_${g.id}`)}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {g.enabled ? (
                            <Badge variant="outline" className="text-[10px] font-normal border-success/40 text-success-text gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {t("settings.gateway_connected")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-normal">{t("settings.gateway_disabled")}</Badge>
                          )}
                        </div>
                      </div>
                      {canManage && <Switch checked={g.enabled} onCheckedChange={() => handleToggleGateway(g.id)} />}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">{t("settings.gateway_abstraction_note")}</p>
            </PageSection>

            <PageSection title={t("settings.transactions_title")} subtitle={t("settings.transactions_sub")} padded={false}>
              {transactions.length === 0 ? (
                <EmptyState icon={Receipt} title={t("settings.transactions_empty")} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="text-xs text-muted-foreground">{t("settings.col_order")}</TableHead>
                      <TableHead className="text-xs text-muted-foreground">{t("settings.col_method")}</TableHead>
                      <TableHead className="text-xs text-muted-foreground">{t("settings.col_amount")}</TableHead>
                      <TableHead className="text-xs text-muted-foreground">{t("settings.col_date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((o) => (
                      <TableRow key={o.id} className="border-b border-border last:border-0">
                        <TableCell className="font-mono text-xs" dir="ltr">{o.code}</TableCell>
                        <TableCell className="text-sm">{t(`orders.payment_method_${o.payment_method}`)}</TableCell>
                        <TableCell className="tabular-nums text-sm">{formatMoney(o.total, lang)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">{formatDate(o.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </PageSection>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <PageSection title={t("settings.zones_title")} subtitle={t("settings.zones_sub")}>
              {zones.length === 0 ? (
                <EmptyState icon={Truck} title={t("settings.zones_empty")} />
              ) : (
                <div className="divide-y divide-border">
                  {zones.map((z) => (
                    <div key={z.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex-1 text-sm">{z.name_ar}</span>
                      <Input
                        type="number" min={0} className="w-24 h-8 tabular-nums"
                        value={z.cost}
                        onChange={(e) => updateZone(z.id, { cost: Number(e.target.value) })}
                        disabled={!canManage}
                      />
                      <span className="text-xs text-muted-foreground">{t("settings.currency_unit")}</span>
                      {canManage && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-danger-text hover:text-danger-text" onClick={() => removeZone(z.id)} aria-label={t("settings.remove_zone")}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canManage && (
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder={t("settings.zone_name_placeholder")} className="flex-1" />
                  <Input type="number" min={0} value={zoneCost} onChange={(e) => setZoneCost(e.target.value)} placeholder={t("settings.zone_cost_placeholder")} className="w-28 tabular-nums" />
                  <Button variant="outline" onClick={handleAddZone}><Plus className="h-4 w-4" /> {t("settings.add_zone")}</Button>
                </div>
              )}
            </PageSection>

            <PageSection title={t("settings.carriers_title")} subtitle={t("settings.carriers_sub")}>
              {carriers.length === 0 ? (
                <EmptyState icon={Truck} title={t("settings.carriers_empty")} />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {carriers.map((c) => (
                    <Badge key={c} variant="outline" className="gap-1.5 font-normal">
                      {c}
                      {canManage && (
                        <button type="button" onClick={() => removeCarrier(c)} aria-label={t("settings.remove_carrier")}>
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
              {canManage && (
                <div className="flex items-center gap-2 pt-3 border-t border-border mt-3">
                  <Input value={carrierDraft} onChange={(e) => setCarrierDraft(e.target.value)} placeholder={t("settings.carrier_placeholder")} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCarrier())} />
                  <Button variant="outline" onClick={handleAddCarrier}><Plus className="h-4 w-4" /></Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-2 mt-2 border-t border-border">{t("settings.manual_tracking_note")}</p>
            </PageSection>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
