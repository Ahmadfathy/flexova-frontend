import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Settings2, Printer, Box, ScanBarcode, Scale, Lock,
  ShieldCheck, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import {
  usePosTerminalSettings, CURRENT_TERMINAL, type HardwareKey,
} from "@/stores/posTerminalSettings";
import inventoryFixtures from "@/lib/mock/fixtures/inventory.fixtures.json";

const WAREHOUSES = inventoryFixtures.warehouses as { id: string; name_ar: string; name_en: string }[];
const PRICE_LISTS = inventoryFixtures.price_lists as { id: string; name_ar: string; name_en: string }[];

const HARDWARE: { key: HardwareKey; icon: typeof Printer; labelKey: string; testLabelKey: string; toastKey: string }[] = [
  { key: "printer", icon: Printer, labelKey: "settings.printer", testLabelKey: "settings.test_print", toastKey: "settings.test_print_toast" },
  { key: "drawer", icon: Box, labelKey: "settings.drawer", testLabelKey: "settings.test_drawer", toastKey: "settings.test_drawer_toast" },
  { key: "scanner", icon: ScanBarcode, labelKey: "settings.scanner", testLabelKey: "settings.test_scan", toastKey: "settings.test_scan_toast" },
  { key: "scale", icon: Scale, labelKey: "settings.scale", testLabelKey: "settings.test_weigh", toastKey: "settings.test_weigh_toast" },
];

function HardwareCard({ item }: { item: (typeof HARDWARE)[number] }) {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const bound = usePosTerminalSettings(s => s.hardwareBound[item.key]);
  const lastTested = usePosTerminalSettings(s => s.lastTestedAt[item.key]);
  const toggleHardware = usePosTerminalSettings(s => s.toggleHardware);
  const testHardware = usePosTerminalSettings(s => s.testHardware);
  const Icon = item.icon;

  const handleTest = () => {
    testHardware(item.key);
    if (item.key === "scanner") {
      toast.success(t(item.toastKey, { code: "6221031400015" }));
    } else if (item.key === "scale") {
      toast.success(t(item.toastKey, { kg: "1.750" }));
    } else {
      toast.success(t(item.toastKey));
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <span className="flex items-center justify-center h-11 w-11 rounded bg-muted text-muted-foreground shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold text-foreground">{t(item.labelKey)}</p>
        <p className="text-xs text-muted-foreground">
          {lastTested
            ? t("settings.last_tested", { time: new Date(lastTested).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }) })
            : t("settings.never_tested")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" className="h-9" disabled={!bound} onClick={handleTest}>
          {t(item.testLabelKey)}
        </Button>
        <Switch checked={bound} onCheckedChange={() => toggleHardware(item.key)} aria-label={t(item.labelKey)} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation("pos");
  const { lang } = useAppearance();
  const can = useCan();

  const defaultWarehouseId = usePosTerminalSettings(s => s.defaultWarehouseId);
  const defaultPriceListId = usePosTerminalSettings(s => s.defaultPriceListId);
  const setDefaultWarehouse = usePosTerminalSettings(s => s.setDefaultWarehouse);
  const setDefaultPriceList = usePosTerminalSettings(s => s.setDefaultPriceList);
  const etaDeviceActivated = usePosTerminalSettings(s => s.etaDeviceActivated);
  const etaAccessToken = usePosTerminalSettings(s => s.etaAccessToken);
  const activateEtaDevice = usePosTerminalSettings(s => s.activateEtaDevice);
  const deactivateEtaDevice = usePosTerminalSettings(s => s.deactivateEtaDevice);
  const regenerateEtaToken = usePosTerminalSettings(s => s.regenerateEtaToken);

  const [tokenVisible, setTokenVisible] = useState(false);

  if (!can("pos.terminal.settings")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("settings.permission_required")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full mx-auto space-y-5 pb-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-base font-semibold text-foreground">{t("settings.title")}</h1>
      </div>

      {/* Hardware bridge */}
      <div className="space-y-2">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("settings.section_hardware")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("settings.hardware_hint")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {HARDWARE.map(item => <HardwareCard key={item.key} item={item} />)}
        </div>
      </div>

      {/* Defaults */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("settings.section_defaults")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("settings.default_warehouse")}</Label>
            <Select
              value={defaultWarehouseId}
              onValueChange={(v) => { setDefaultWarehouse(v); toast.success(t("settings.saved_toast")); }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WAREHOUSES.map(w => (
                  <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("settings.default_price_list")}</Label>
            <Select
              value={defaultPriceListId}
              onValueChange={(v) => { setDefaultPriceList(v); toast.success(t("settings.saved_toast")); }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRICE_LISTS.map(pl => (
                  <SelectItem key={pl.id} value={pl.id}>{lang === "ar" ? pl.name_ar : pl.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Numbering */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("settings.section_numbering")}</p>
        <p className="text-xs text-muted-foreground">{t("settings.numbering_hint")}</p>
        <div className="flex items-center justify-between pt-1.5 text-sm">
          <span className="text-muted-foreground">{t("settings.current_prefix")}</span>
          <span className="font-mono font-semibold tabular-nums" dir="ltr">{CURRENT_TERMINAL.number_prefix}-…</span>
        </div>
      </div>

      {/* ETA device */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("settings.section_eta_device")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("settings.eta_device_hint")}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className={
            etaDeviceActivated
              ? "flex items-center justify-center h-10 w-10 rounded bg-success-tint text-success-text shrink-0"
              : "flex items-center justify-center h-10 w-10 rounded bg-muted text-muted-foreground shrink-0"
          }>
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {etaDeviceActivated ? t("settings.eta_activated_label") : t("settings.not_activated")}
            </p>
            {etaDeviceActivated && etaAccessToken && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-mono text-xs text-muted-foreground truncate" dir="ltr">
                  {tokenVisible ? etaAccessToken : "•".repeat(16)}
                </span>
                <button
                  type="button"
                  className="text-xs text-brand-text underline underline-offset-2 shrink-0"
                  onClick={() => setTokenVisible(v => !v)}
                >
                  {tokenVisible ? t("settings.token_hide") : t("settings.token_show")}
                </button>
              </div>
            )}
          </div>
          {etaDeviceActivated ? (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm" variant="outline" className="h-9"
                onClick={() => { regenerateEtaToken(); toast.success(t("settings.token_regenerated_toast")); }}
              >
                <RefreshCw className="h-3.5 w-3.5 me-1.5" />
                {t("settings.regenerate_token")}
              </Button>
              <Button
                size="sm" variant="outline" className="h-9"
                onClick={() => { deactivateEtaDevice(); toast.info(t("settings.eta_deactivated_toast")); }}
              >
                {t("settings.eta_deactivate")}
              </Button>
            </div>
          ) : (
            <Button
              size="sm" className="h-9 shrink-0"
              onClick={() => { activateEtaDevice(); toast.success(t("settings.eta_activated_toast")); }}
            >
              {t("settings.eta_activate")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
