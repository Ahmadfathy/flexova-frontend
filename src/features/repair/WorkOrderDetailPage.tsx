import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Smartphone, Laptop, Plug, Car, ClipboardList, FileText, Wrench, Wallet, ShieldCheck,
  ArrowLeft, ExternalLink, Trash2, Flag, CheckCircle2, AlertTriangle, Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { formatDate, formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useRprWorkOrders } from "@/stores/rprWorkOrders";
import { useRprPartsStock, effectiveStock } from "@/stores/rprPartsStock";
import {
  SETTINGS, TECHNICIANS, LABOR_SERVICES,
  findCustomer, customerName, findTechnician, technicianName, findPart, partName,
  findLaborService, laborServiceName, deviceLabel, statusPillVariant,
  type RprWorkOrder, type RprWoStatus, type RprPart,
} from "./catalog";
import { computeCommission } from "./commission";
import { useWorkOrderDetail } from "./useWorkOrderDetail";
import { RprPartPicker } from "./RprPartPicker";
import { SendQuoteDialog } from "./SendQuoteDialog";

type TabKey = "diagnosis" | "quote" | "execution" | "payments" | "warranty";

function defaultTab(status: RprWoStatus): TabKey {
  if (status === "pending_diagnosis") return "diagnosis";
  if (status === "in_progress" || status === "ready" || status === "delivered") return "execution";
  return "quote"; // pending_approval, rejected
}

const DEVICE_ICON = { mobile: Smartphone, computer: Laptop, appliance: Plug, vehicle: Car } as const;

function DetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

export default function WorkOrderDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("repair");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();

  const { workOrder: wo, notFound, loading, error, isOffline, reload } = useWorkOrderDetail(id);

  const saveDiagnosis = useRprWorkOrders((s) => s.saveDiagnosis);
  const addQuotePartLine = useRprWorkOrders((s) => s.addQuotePartLine);
  const removeQuotePartLine = useRprWorkOrders((s) => s.removeQuotePartLine);
  const addQuoteLaborLine = useRprWorkOrders((s) => s.addQuoteLaborLine);
  const removeQuoteLaborLine = useRprWorkOrders((s) => s.removeQuoteLaborLine);
  const sendQuoteForApproval = useRprWorkOrders((s) => s.sendQuoteForApproval);
  const approveQuote = useRprWorkOrders((s) => s.approveQuote);
  const rejectWorkOrder = useRprWorkOrders((s) => s.rejectWorkOrder);
  const addExecutionPartLine = useRprWorkOrders((s) => s.addExecutionPartLine);
  const addExecutionLaborLine = useRprWorkOrders((s) => s.addExecutionLaborLine);
  const markReady = useRprWorkOrders((s) => s.markReady);
  const depleteStock = useRprPartsStock((s) => s.deplete);
  const depleted = useRprPartsStock((s) => s.depleted);

  const [tabInit, setTabInit] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("diagnosis");
  const [diagResult, setDiagResult] = useState("");
  const [diagProposed, setDiagProposed] = useState("");
  const [quotePickerOpen, setQuotePickerOpen] = useState(false);
  const [execPickerOpen, setExecPickerOpen] = useState(false);
  const [quoteLaborService, setQuoteLaborService] = useState("");
  const [quoteLaborTech, setQuoteLaborTech] = useState("");
  const [execLaborService, setExecLaborService] = useState("");
  const [execLaborTech, setExecLaborTech] = useState("");
  const [sendQuoteOpen, setSendQuoteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [chargeDiagFee, setChargeDiagFee] = useState(false);

  useEffect(() => {
    if (wo && !tabInit) {
      setActiveTab(defaultTab(wo.status));
      setDiagResult(wo.diagnosis?.result ?? "");
      setDiagProposed(wo.diagnosis?.proposed_work ?? "");
      setTabInit(true);
    }
  }, [wo, tabInit]);

  if (loading) return <DetailSkeleton />;
  if (error) {
    return <div className="p-4"><ErrorState title={t("wo.error_title")} description={t("wo.error_body")} onRetry={reload} /></div>;
  }
  if (notFound || !wo) {
    return (
      <div className="p-4">
        <EmptyState icon={Receipt} title={t("wo.not_found_title")} description={t("wo.not_found_body")}
          action={{ label: t("wo.back_to_board"), onClick: () => navigate("/repair/board") }} />
      </div>
    );
  }

  const customer = findCustomer(wo.customer_id);
  const technician = findTechnician(wo.technician_id);
  const DeviceIcon = DEVICE_ICON[wo.device.type];
  const isDelivered = wo.status === "delivered";
  const isRejected = wo.status === "rejected";
  const composingQuote = wo.status === "pending_diagnosis" && !wo.quote?.sent_at;
  const executionUnlocked = wo.status === "in_progress" || wo.status === "ready" || wo.status === "delivered";
  const canAddExecution = wo.status === "in_progress";
  const laborCommission = computeCommission(wo.labor_lines);

  function handleSaveDiagnosis() {
    if (!diagResult.trim() || !diagProposed.trim() || !wo) return;
    saveDiagnosis(wo.id, { result: diagResult.trim(), proposed_work: diagProposed.trim() });
    toast.success(t("wo.diagnosis_saved_toast"));
  }

  function handlePickQuotePart(part: RprPart) {
    if (!wo) return;
    addQuotePartLine(wo.id, { part_id: part.id, qty: 1, price: part.price });
  }

  function handleAddQuoteLabor() {
    if (!wo || !quoteLaborService || !quoteLaborTech) return;
    const service = findLaborService(quoteLaborService);
    if (!service) return;
    addQuoteLaborLine(wo.id, { service_id: service.id, technician_id: quoteLaborTech, price: service.price });
    setQuoteLaborService(""); setQuoteLaborTech("");
  }

  function handlePickExecutionPart(part: RprPart) {
    if (!wo) return;
    const before = effectiveStock(part.stock, part.id, depleted);
    const after = before - 1;
    depleteStock(part.id, 1);
    addExecutionPartLine(wo.id, {
      part_id: part.id, qty: 1, price: part.price, deducted: true,
      _flag: !part.eta_code ? "no_eta_code" : after < 0 ? "negative_stock" : undefined,
    });
    if (after < 0) toast.warning(t("wo.negative_stock_warning", { name: partName(part, lang) }));
  }

  function handleAddExecutionAdhoc(name: string, price: number) {
    if (!wo) return;
    addExecutionPartLine(wo.id, { part_id: null, adhoc_name: name, qty: 1, price, deducted: false, _flag: "parts_adhoc" });
    toast.warning(t("wo.part_adhoc"));
  }

  function handleAddExecutionLabor() {
    if (!wo || !execLaborService || !execLaborTech) return;
    const service = findLaborService(execLaborService);
    if (!service) return;
    addExecutionLaborLine(wo.id, { service_id: service.id, technician_id: execLaborTech, price: service.price });
    setExecLaborService(""); setExecLaborTech("");
  }

  function handleSendQuote(channel: Parameters<typeof sendQuoteForApproval>[1]) {
    if (!wo) return;
    sendQuoteForApproval(wo.id, channel);
    toast.success(t("wo.sent_toast"));
  }

  function handleApprove() {
    if (!wo) return;
    approveQuote(wo.id);
    toast.success(t("wo.approve_toast"));
  }

  function handleReject() {
    if (!wo) return;
    rejectWorkOrder(wo.id, { chargeDiagnosisFee: chargeDiagFee });
    setRejectOpen(false);
    setChargeDiagFee(false);
    toast.success(t("wo.reject_toast"));
  }

  function handleMarkReady() {
    if (!wo) return;
    markReady(wo.id);
    toast.success(t("wo.ready_toast"));
  }

  function handleDeliver() {
    toast.info(t("wo.deliver_stub_toast"));
  }

  const canSendQuote = !!wo.diagnosis && !!wo.quote && (wo.quote.part_lines.length + wo.quote.labor_lines.length) > 0;

  return (
    <div className="h-full overflow-auto p-4 pb-28 lg:pb-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {isOffline && <OfflineBanner message={t("wo.offline_note")} />}

        {isDelivered && (
          <div className="flex items-start gap-2 px-4 py-2.5 bg-muted rounded border border-border text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
            <span>{t("wo.locked")}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="icon" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/repair/board")} aria-label={t("wo.back_to_board")}>
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Button>
          <span className="font-mono text-sm font-semibold text-foreground" dir="ltr">{wo.number}</span>
          <StatusPill variant={statusPillVariant(wo.status)} label={t(`status.${wo.status}`)} />
          {wo._flag === "under_warranty" && wo.original_wo_id && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(`/repair/${wo.original_wo_id}`)}>
              <ShieldCheck className="h-3.5 w-3.5 me-1" /> {t("wo.warranty_link")}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* START — header/identity */}
          <div className="space-y-3 rounded-lg border border-border bg-card p-4 h-fit">
            <div>
              <p className="text-xs text-muted-foreground">{t("intake.customer")}</p>
              <Button
                variant="ghost" size="sm" className="h-auto p-0 text-sm font-medium text-brand-text gap-1"
                onClick={() => navigate("/customers/list")}
              >
                {customer ? customerName(customer, lang) : wo.customer_id}
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-border">
              <DeviceIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{deviceLabel(wo.device) || t(`device.${wo.device.type}`)}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{wo.device.serial ?? "—"}</p>
                {wo.device._flag === "device_no_serial" && (
                  <p className="text-xs text-warning-text flex items-center gap-1 mt-0.5">
                    <Flag className="h-3 w-3" /> {t("intake.no_serial")}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">{t("intake.technician")}</p>
              <p className="text-sm text-foreground">{technician ? technicianName(technician, lang) : "—"}</p>
            </div>

            <div className="pt-2 border-t border-border space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("wo.dates_intake")}</span>
                <span className="tabular-nums">{formatDate(wo.intake_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("board.promise")}</span>
                <span className="tabular-nums">{formatDate(wo.promise_at)}</span>
              </div>
              {wo.ready_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("wo.dates_ready")}</span>
                  <span className="tabular-nums">{formatDate(wo.ready_at)}</span>
                </div>
              )}
              {wo.delivered_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("wo.dates_delivered")}</span>
                  <span className="tabular-nums">{formatDate(wo.delivered_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* END — sectioned work */}
          <div className="min-w-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
              <TabsList className="h-auto p-1 flex-wrap justify-start bg-muted gap-1">
                <TabsTrigger value="diagnosis" className="h-9 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <ClipboardList className="h-3.5 w-3.5 me-1.5" /> {t("wo.diagnosis")}
                </TabsTrigger>
                <TabsTrigger value="quote" className="h-9 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <FileText className="h-3.5 w-3.5 me-1.5" /> {t("wo.quote")}
                </TabsTrigger>
                <TabsTrigger value="execution" className="h-9 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <Wrench className="h-3.5 w-3.5 me-1.5" /> {t("wo.execution")}
                </TabsTrigger>
                <TabsTrigger value="payments" className="h-9 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <Wallet className="h-3.5 w-3.5 me-1.5" /> {t("wo.payments")}
                </TabsTrigger>
                <TabsTrigger value="warranty" className="h-9 px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 me-1.5" /> {t("wo.warranty")}
                </TabsTrigger>
              </TabsList>

              {/* Diagnosis */}
              <TabsContent value="diagnosis" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-3">
                {!wo.diagnosis && !composingQuote && wo.status !== "pending_diagnosis" ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : wo.status === "pending_diagnosis" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">{t("wo.diagnosis_result")}</label>
                      <Textarea value={diagResult} onChange={(e) => setDiagResult(e.target.value)} rows={2} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">{t("wo.proposed_work")}</label>
                      <Textarea value={diagProposed} onChange={(e) => setDiagProposed(e.target.value)} rows={2} />
                    </div>
                    {can("repair.diagnosis.manage") && (
                      <Button size="sm" onClick={handleSaveDiagnosis} disabled={!diagResult.trim() || !diagProposed.trim()}>
                        {t("wo.save_diagnosis")}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("wo.diagnosis_result")}</p>
                      <p className="text-sm text-foreground">{wo.diagnosis?.result}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("wo.proposed_work")}</p>
                      <p className="text-sm text-foreground">{wo.diagnosis?.proposed_work}</p>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Quote */}
              <TabsContent value="quote" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{t("wo.quote")}</span>
                  {wo.quote?.sent_at && (
                    <StatusPill
                      variant={wo.quote.approval_status === "approved" ? "approved" : wo.quote.approval_status === "rejected" ? "rejected" : "pending"}
                      label={t(`wo.approval_status_${wo.quote.approval_status}`)}
                    />
                  )}
                </div>

                <div className="rounded border border-border divide-y divide-border overflow-hidden">
                  {(wo.quote?.part_lines.length ?? 0) === 0 && (wo.quote?.labor_lines.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">{t("wo.no_lines")}</p>
                  ) : (
                    <>
                      {wo.quote?.part_lines.map((line, i) => {
                        const part = findPart(line.part_id);
                        return (
                          <div key={`p${i}`} className="flex items-center gap-2 p-2.5">
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{partName(part, lang)}</span>
                            <span className="tabular-nums text-sm font-medium">{formatMoney(line.qty * line.price, lang)}</span>
                            {composingQuote && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuotePartLine(wo.id, i)} aria-label={t("wo.remove_line")}>
                                <Trash2 className="h-3.5 w-3.5 text-danger" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      {wo.quote?.labor_lines.map((line, i) => {
                        const service = findLaborService(line.service_id);
                        const technicianL = findTechnician(line.technician_id);
                        return (
                          <div key={`l${i}`} className="flex items-center gap-2 p-2.5">
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                              {laborServiceName(service, lang)} — {technicianL ? technicianName(technicianL, lang) : ""}
                            </span>
                            <span className="tabular-nums text-sm font-medium">{formatMoney(line.price, lang)}</span>
                            {composingQuote && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuoteLaborLine(wo.id, i)} aria-label={t("wo.remove_line")}>
                                <Trash2 className="h-3.5 w-3.5 text-danger" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {composingQuote && (
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="h-10 w-full" onClick={() => setQuotePickerOpen(true)}>
                      {t("wo.add_part")}
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={quoteLaborService} onValueChange={setQuoteLaborService}>
                        <SelectTrigger className="h-10 flex-1 min-w-40"><SelectValue placeholder={t("wo.add_labor_service_placeholder")} /></SelectTrigger>
                        <SelectContent>
                          {LABOR_SERVICES.map((s) => <SelectItem key={s.id} value={s.id}>{laborServiceName(s, lang)} · {formatMoney(s.price, lang)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={quoteLaborTech} onValueChange={setQuoteLaborTech}>
                        <SelectTrigger className="h-10 flex-1 min-w-40"><SelectValue placeholder={t("wo.add_labor_technician_placeholder")} /></SelectTrigger>
                        <SelectContent>
                          {TECHNICIANS.map((tc) => <SelectItem key={tc.id} value={tc.id}>{technicianName(tc, lang)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-10" onClick={handleAddQuoteLabor} disabled={!quoteLaborService || !quoteLaborTech}>
                        {t("wo.add_labor")}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border font-semibold">
                  <span className="text-sm text-foreground">{t("wo.total")}</span>
                  <span className="tabular-nums">{formatMoney(wo.quote?.total ?? 0, lang)}</span>
                </div>
              </TabsContent>

              {/* Execution */}
              <TabsContent value="execution" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-3">
                {!executionUnlocked && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-warning-tint text-warning-text rounded border border-warning/20 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {t("wo.quote_before_exec")}
                  </div>
                )}

                <div className="rounded border border-border divide-y divide-border overflow-hidden">
                  {wo.part_lines.length === 0 && wo.labor_lines.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">{t("wo.no_lines")}</p>
                  ) : (
                    <>
                      {wo.part_lines.map((line, i) => {
                        const part = findPart(line.part_id);
                        const label = line.part_id ? partName(part, lang) : line.adhoc_name;
                        return (
                          <div key={`ep${i}`} className="flex items-center gap-2 p-2.5">
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground flex items-center gap-1.5">
                              {label}
                              {line._flag && <Flag className="h-3 w-3 text-warning shrink-0" />}
                            </span>
                            <span className="tabular-nums text-sm font-medium">{formatMoney(line.qty * line.price, lang)}</span>
                          </div>
                        );
                      })}
                      {wo.labor_lines.map((line, i) => {
                        const service = findLaborService(line.service_id);
                        const technicianL = findTechnician(line.technician_id);
                        const commission = laborCommission[i];
                        return (
                          <div key={`el${i}`} className="p-2.5">
                            <div className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                                {laborServiceName(service, lang)} — {technicianL ? technicianName(technicianL, lang) : ""}
                              </span>
                              <span className="tabular-nums text-sm font-medium">{formatMoney(line.price, lang)}</span>
                            </div>
                            {commission && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t("wo.est_commission")}: {formatMoney(commission.amount, lang)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {canAddExecution && can("repair.parts.consume") && (
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="h-10 w-full" onClick={() => setExecPickerOpen(true)}>
                      {t("wo.add_part")}
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={execLaborService} onValueChange={setExecLaborService}>
                        <SelectTrigger className="h-10 flex-1 min-w-40"><SelectValue placeholder={t("wo.add_labor_service_placeholder")} /></SelectTrigger>
                        <SelectContent>
                          {LABOR_SERVICES.map((s) => <SelectItem key={s.id} value={s.id}>{laborServiceName(s, lang)} · {formatMoney(s.price, lang)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={execLaborTech} onValueChange={setExecLaborTech}>
                        <SelectTrigger className="h-10 flex-1 min-w-40"><SelectValue placeholder={t("wo.add_labor_technician_placeholder")} /></SelectTrigger>
                        <SelectContent>
                          {TECHNICIANS.map((tc) => <SelectItem key={tc.id} value={tc.id}>{technicianName(tc, lang)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-10" onClick={handleAddExecutionLabor} disabled={!execLaborService || !execLaborTech}>
                        {t("wo.add_labor")}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Payments */}
              <TabsContent value="payments" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-3">
                {wo.deposit ? (
                  <div className="rounded border border-border p-3 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("intake.deposit")}</span>
                      <span className="tabular-nums font-medium">{formatMoney(wo.deposit.amount, lang)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatDate(wo.deposit.taken_at)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("wo.payments_none")}</p>
                )}
                <p className="text-xs text-muted-foreground">{t("wo.payments_note")}</p>
              </TabsContent>

              {/* Warranty */}
              <TabsContent value="warranty" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("settings.warranty_days")}</span>
                  <span className="tabular-nums font-medium">{wo.warranty_days}</span>
                </div>
                {wo.delivered_at ? (
                  <p className="text-xs text-muted-foreground">
                    {t("wo.warranty_started")}: {formatDate(wo.delivered_at)}
                    {wo.warranty_expires_at && ` — ${t("wo.warranty_expires")}: ${formatDate(wo.warranty_expires_at)}`}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("wo.warranty_not_started")}</p>
                )}
                {wo._flag === "under_warranty" && (
                  <p className="text-xs text-warning-text">{t("wo.warranty_zero_note")}</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {isRejected && (
          <div className="flex items-start gap-2 px-4 py-2.5 bg-muted rounded border border-border text-sm text-muted-foreground">
            <span>{t(`status.rejected`)}{wo.diagnosis_fee?.charged ? ` — ${t("wo.reject_fee_label")} ${formatMoney(wo.diagnosis_fee.amount, lang)}` : ""}</span>
          </div>
        )}

        {/* Lifecycle action bar */}
        <div className="hidden lg:flex items-center justify-end gap-2 flex-wrap">
          <LifecycleActions
            wo={wo} can={can} t={t}
            onStartDiagnosis={() => setActiveTab("diagnosis")}
            onSendQuote={() => setSendQuoteOpen(true)}
            canSendQuote={canSendQuote}
            onApprove={handleApprove}
            onReject={() => setRejectOpen(true)}
            onMarkReady={handleMarkReady}
            onDeliver={handleDeliver}
          />
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 p-3 bg-card border-t border-border flex items-center gap-2 overflow-x-auto">
        <LifecycleActions
          wo={wo} can={can} t={t}
          onStartDiagnosis={() => setActiveTab("diagnosis")}
          onSendQuote={() => setSendQuoteOpen(true)}
          canSendQuote={canSendQuote}
          onApprove={handleApprove}
          onReject={() => setRejectOpen(true)}
          onMarkReady={handleMarkReady}
          onDeliver={handleDeliver}
        />
      </div>

      <RprPartPicker
        open={quotePickerOpen}
        onOpenChange={setQuotePickerOpen}
        lang={lang}
        onPickPart={handlePickQuotePart}
      />
      <RprPartPicker
        open={execPickerOpen}
        onOpenChange={setExecPickerOpen}
        lang={lang}
        onPickPart={handlePickExecutionPart}
        onAddAdhoc={handleAddExecutionAdhoc}
      />
      <SendQuoteDialog
        open={sendQuoteOpen}
        onOpenChange={setSendQuoteOpen}
        lang={lang}
        workOrder={wo}
        onSend={handleSendQuote}
      />
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={(o) => { setRejectOpen(o); if (!o) setChargeDiagFee(false); }}
        title={t("wo.reject_title")}
        description={t("wo.reject_body")}
        confirmTone="danger"
        confirmLabel={t("wo.reject")}
        onConfirm={handleReject}
      >
        {SETTINGS.diagnosis_fee.enabled && (
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>{t("wo.reject_fee_label")} ({formatMoney(SETTINGS.diagnosis_fee.amount, lang)})</span>
            <Switch checked={chargeDiagFee} onCheckedChange={setChargeDiagFee} />
          </label>
        )}
      </ConfirmDialog>
    </div>
  );
}

interface LifecycleActionsProps {
  wo: RprWorkOrder;
  can: ReturnType<typeof useCan>;
  t: ReturnType<typeof useTranslation>["t"];
  onStartDiagnosis: () => void;
  onSendQuote: () => void;
  canSendQuote: boolean;
  onApprove: () => void;
  onReject: () => void;
  onMarkReady: () => void;
  onDeliver: () => void;
}

function LifecycleActions({
  wo, can, t, onStartDiagnosis, onSendQuote, canSendQuote, onApprove, onReject, onMarkReady, onDeliver,
}: LifecycleActionsProps) {
  return (
    <>
      {wo.status === "pending_diagnosis" && can("repair.diagnosis.manage") && (
        <Button variant="outline" onClick={onStartDiagnosis}>{t("wo.start_diagnosis")}</Button>
      )}
      {wo.status === "pending_diagnosis" && can("repair.quote.manage") && (
        <Button onClick={onSendQuote} disabled={!canSendQuote}>{t("wo.send_approval")}</Button>
      )}
      {wo.status === "pending_approval" && (
        <>
          {can("repair.quote.approve") && (
            <Button onClick={onApprove}>{t("wo.approve")}</Button>
          )}
          <Button variant="outline" tone="danger" onClick={onReject}>{t("wo.reject")}</Button>
        </>
      )}
      {wo.status === "in_progress" && can("repair.quote.manage") && (
        <Button onClick={onMarkReady}>{t("wo.mark_ready")}</Button>
      )}
      {can("repair.deliver") && (
        <Button variant="solid" tone="primary" disabled={wo.status !== "ready"} onClick={onDeliver}>{t("wo.deliver")}</Button>
      )}
    </>
  );
}
