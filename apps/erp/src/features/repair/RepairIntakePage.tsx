import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/patterns/DatePicker";
import { FormSection, FormField, FormGrid, FormActions } from "@/components/patterns/FormLayout";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useRprWorkOrders } from "@/stores/rprWorkOrders";
import {
  TECHNICIANS, TREASURIES,
  findCustomer, customerName, technicianName, treasuryName,
  type RprDeviceType, type RprWorkOrder,
} from "./catalog";
import { RprCustomerPicker } from "./RprCustomerPicker";
import { IntakeTicketDialog } from "./IntakeTicketDialog";

const DEVICE_TYPES: RprDeviceType[] = ["mobile", "computer", "appliance", "vehicle"];
const ACCESSORY_KEYS = ["charger", "case", "sim", "box"] as const;
const CONDITION_CHIP_KEYS = ["scratches", "no_power", "screen_cracked", "water_damage"] as const;

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "h-8 px-3 rounded-full border text-xs font-medium whitespace-nowrap transition-colors " +
        (active
          ? "bg-brand text-on-brand border-brand"
          : "border-border text-foreground hover:border-brand/40")
      }
    >
      {children}
    </button>
  );
}

export default function RepairIntakePage() {
  const { t } = useTranslation("repair");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();
  const createWorkOrder = useRprWorkOrders((s) => s.createWorkOrder);
  const canTakeDeposit = can("repair.deposit.take");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Customer
  const [customerId, setCustomerId] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  // Device
  const [deviceType, setDeviceType] = useState<RprDeviceType>("mobile");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [condition, setCondition] = useState("");
  const [accessories, setAccessories] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [chassis, setChassis] = useState("");
  const [plate, setPlate] = useState("");
  const [odometer, setOdometer] = useState("");

  // Faults / deposit / assignment
  const [reportedFaults, setReportedFaults] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTreasuryId, setDepositTreasuryId] = useState(TREASURIES[0]?.id ?? "");
  const [promiseDate, setPromiseDate] = useState(tomorrow());
  const [technicianId, setTechnicianId] = useState(TECHNICIANS[0]?.id ?? "");

  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticketWo, setTicketWo] = useState<RprWorkOrder | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);

  const customer = findCustomer(customerId);
  const customerError = attempted && !customerId ? t("intake.customer_required") : undefined;
  const deviceTypeError = attempted && !deviceType ? t("intake.device_type_required") : undefined;

  function toggleAccessory(label: string) {
    setAccessories((prev) => (prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]));
  }

  function appendConditionChip(label: string) {
    setCondition((prev) => (prev.includes(label) ? prev : prev ? `${prev}، ${label}` : label));
  }

  function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...urls]);
    e.target.value = "";
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  async function handleSave() {
    setAttempted(true);
    if (!customerId || !deviceType) return;

    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));

    const depositValue = parseFloat(depositAmount);
    const hasDeposit = canTakeDeposit && depositValue > 0;

    const wo = createWorkOrder({
      customer_id: customerId,
      technician_id: technicianId,
      device: {
        type: deviceType,
        brand: brand.trim(),
        model: model.trim(),
        serial: serial.trim() ? serial.trim() : null,
        intake_condition: condition.trim(),
        accessories,
        photos,
        ...(deviceType === "vehicle" ? {
          chassis: chassis.trim() || undefined,
          plate: plate.trim() || undefined,
          odometer: odometer ? Number(odometer) : undefined,
        } : {}),
      },
      reported_faults: reportedFaults.trim(),
      deposit: hasDeposit ? { amount: depositValue, treasury_id: depositTreasuryId } : null,
      promise_at: promiseDate,
    });

    setSaving(false);

    if (!serial.trim()) toast.warning(t("intake.no_serial_toast"));
    toast.success(t("intake.saved_toast", { number: wo.number }));
    if (hasDeposit) {
      const treasury = TREASURIES.find((tr) => tr.id === depositTreasuryId);
      toast.success(t("intake.deposit_posted_toast", { amount: depositValue, treasury: treasury ? treasuryName(treasury, lang) : "" }));
    }

    setTicketWo(wo);
    setTicketOpen(true);
  }

  return (
    <div className="h-full overflow-auto p-4 pb-24 lg:pb-4">
      <h1 className="text-base font-semibold text-foreground mb-4">{t("intake.new")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* START — customer + device */}
        <div className="space-y-6">
          <FormSection title={t("intake.customer")}>
            <FormField label={t("intake.customer")} required error={customerError}>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start h-11"
                onClick={() => setCustomerPickerOpen(true)}
              >
                {customer ? customerName(customer, lang) : t("intake.customer_search_placeholder")}
              </Button>
            </FormField>
          </FormSection>

          <FormSection title={t("intake.device_type")}>
            <FormField label={t("intake.device_type")} required error={deviceTypeError}>
              <Select value={deviceType} onValueChange={(v) => setDeviceType(v as RprDeviceType)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((dt) => <SelectItem key={dt} value={dt}>{t(`device.${dt}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>

            <FormGrid cols={2}>
              <FormField label={t("intake.brand")}>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="h-11" />
              </FormField>
              <FormField label={t("intake.model")}>
                <Input value={model} onChange={(e) => setModel(e.target.value)} className="h-11" />
              </FormField>
            </FormGrid>

            <FormField label={t("intake.serial")} helper={!serial.trim() ? t("intake.no_serial") : undefined}>
              <Input value={serial} onChange={(e) => setSerial(e.target.value)} dir="ltr" className="h-11" />
            </FormField>

            {deviceType === "vehicle" && (
              <FormGrid cols={3}>
                <FormField label={t("intake.vehicle_chassis")}>
                  <Input value={chassis} onChange={(e) => setChassis(e.target.value)} dir="ltr" className="h-11" />
                </FormField>
                <FormField label={t("intake.vehicle_plate")}>
                  <Input value={plate} onChange={(e) => setPlate(e.target.value)} dir="ltr" className="h-11" />
                </FormField>
                <FormField label={t("intake.vehicle_odometer")}>
                  <Input type="number" min={0} value={odometer} onChange={(e) => setOdometer(e.target.value)} className="h-11 tabular-nums" />
                </FormField>
              </FormGrid>
            )}

            <FormField label={t("intake.condition")}>
              <Textarea value={condition} onChange={(e) => setCondition(e.target.value)} rows={2} />
              <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                {CONDITION_CHIP_KEYS.map((k) => (
                  <Chip key={k} active={false} onClick={() => appendConditionChip(t(`intake.condition_chip_${k}`))}>
                    {t(`intake.condition_chip_${k}`)}
                  </Chip>
                ))}
              </div>
            </FormField>

            <FormField label={t("intake.accessories")}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ACCESSORY_KEYS.map((k) => {
                  const label = t(`intake.accessory_${k}`);
                  return (
                    <Chip key={k} active={accessories.includes(label)} onClick={() => toggleAccessory(label)}>
                      {label}
                    </Chip>
                  );
                })}
              </div>
            </FormField>

            <FormField label={t("intake.photos")}>
              <div className="flex items-center gap-2 flex-wrap">
                {photos.map((url) => (
                  <div key={url} className="relative h-14 w-14 rounded border border-border overflow-hidden shrink-0">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute top-0 end-0 h-4 w-4 flex items-center justify-center bg-danger text-on-brand"
                      aria-label={t("intake.faults")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <input ref={photoInputRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleAddPhoto} />
                <Button type="button" variant="outline" size="sm" className="h-14 w-14 flex-col gap-0.5" onClick={() => photoInputRef.current?.click()}>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </FormField>
          </FormSection>
        </div>

        {/* END — faults / deposit / assignment */}
        <div className="space-y-6">
          <FormSection title={t("intake.faults")}>
            <FormField label={t("intake.faults")}>
              <Textarea
                value={reportedFaults}
                onChange={(e) => setReportedFaults(e.target.value)}
                placeholder={t("intake.faults_placeholder")}
                rows={3}
              />
            </FormField>
          </FormSection>

          <FormSection title={t("intake.deposit")}>
            {canTakeDeposit ? (
              <FormGrid cols={2}>
                <FormField label={t("intake.deposit_amount")}>
                  <Input
                    type="number" min={0} step="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="h-11 tabular-nums"
                    placeholder="0"
                  />
                </FormField>
                <FormField label={t("intake.deposit_treasury")}>
                  <Select value={depositTreasuryId} onValueChange={setDepositTreasuryId} disabled={!parseFloat(depositAmount || "0")}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TREASURIES.map((tr) => <SelectItem key={tr.id} value={tr.id}>{treasuryName(tr, lang)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormGrid>
            ) : (
              <p className="text-xs text-muted-foreground">{t("board.permission_required")}</p>
            )}
          </FormSection>

          <FormSection title={t("intake.promise")}>
            <FormGrid cols={2}>
              <FormField label={t("intake.promise")}>
                <DatePicker value={promiseDate} onChange={setPromiseDate} min={new Date().toISOString().slice(0, 10)} className="h-11 w-full" />
              </FormField>
              <FormField label={t("intake.technician")}>
                <Select value={technicianId} onValueChange={setTechnicianId}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TECHNICIANS.map((tc) => <SelectItem key={tc.id} value={tc.id}>{technicianName(tc, lang)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </FormGrid>
          </FormSection>

          <FormActions
            onCancel={() => navigate("/repair/board")}
            onSave={handleSave}
            saveLabel={t("intake.save_print")}
            cancelLabel={t("intake.cancel")}
            saving={saving}
            className="hidden lg:flex"
          />
        </div>
      </div>

      {/* Mobile — sticky save bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 p-3 bg-card border-t border-border">
        <Button className="w-full h-11" onClick={handleSave} disabled={saving}>
          {t("intake.save_print")}
        </Button>
      </div>

      <RprCustomerPicker
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        lang={lang}
        onPickCustomer={setCustomerId}
      />

      <IntakeTicketDialog
        workOrder={ticketWo}
        open={ticketOpen}
        onOpenChange={(open) => {
          setTicketOpen(open);
          if (!open) navigate("/repair/board");
        }}
      />
    </div>
  );
}
