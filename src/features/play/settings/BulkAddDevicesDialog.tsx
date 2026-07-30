import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { getBranches } from "@/lib/mock/play";
import { usePlayDeviceTypes } from "@/stores/playDeviceTypes";
import { MAX_BULK_COUNT, type BulkAddDevicesInput } from "@/stores/playDevices";

interface BulkAddDevicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: BulkAddDevicesInput) => void;
}

export function BulkAddDevicesDialog({ open, onOpenChange, onConfirm }: BulkAddDevicesDialogProps) {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();

  const deviceTypeList = Object.values(usePlayDeviceTypes((s) => s.deviceTypes));
  const branches = getBranches();

  const [prefix, setPrefix] = useState("PS5");
  const [start, setStart] = useState("1");
  const [count, setCount] = useState("4");
  const [deviceTypeId, setDeviceTypeId] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const startNum = parseInt(start, 10) || 0;
  const countNum = parseInt(count, 10) || 0;

  const preview = useMemo(() => {
    if (!prefix.trim() || countNum <= 0) return [];
    const names: string[] = [];
    for (let i = 0; i < Math.min(countNum, MAX_BULK_COUNT); i++) names.push(`${prefix.trim()}-${startNum + i}`);
    return names;
  }, [prefix, startNum, countNum]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!prefix.trim()) e.prefix = t("dev.bulk_prefix_required");
    if (!countNum || countNum <= 0) e.count = t("dev.bulk_count_required");
    else if (countNum > MAX_BULK_COUNT) e.count = t("dev.bulk_count_max", { n: MAX_BULK_COUNT });
    if (!deviceTypeId) e.device_type = t("dev.bulk_type_required");
    if (!branchId) e.branch = t("dev.branch_required");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleConfirm() {
    if (!validate()) return;
    onConfirm({ prefix: prefix.trim(), start: startNum, count: countNum, device_type_id: deviceTypeId, branch_id: branchId });
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("dev.bulk_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleConfirm}>{t("dev.bulk_confirm")}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("dev.bulk_prefix")} *</Label>
            <Input
              value={prefix} onChange={(e) => setPrefix(e.target.value)} dir="ltr"
              className={cn("font-mono", errors.prefix && "border-destructive")}
            />
            {errors.prefix && <p className="text-xs text-destructive">{errors.prefix}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("dev.bulk_start")}</Label>
            <Input type="number" min={1} value={start} onChange={(e) => setStart(e.target.value)} className="tabular-nums" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dev.bulk_count")} *</Label>
          <Input
            type="number" min={1} max={MAX_BULK_COUNT} value={count} onChange={(e) => setCount(e.target.value)}
            className={cn("tabular-nums", errors.count && "border-destructive")}
          />
          {errors.count && <p className="text-xs text-destructive">{errors.count}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dev.bulk_type")} *</Label>
          <Select value={deviceTypeId} onValueChange={setDeviceTypeId}>
            <SelectTrigger className={cn(errors.device_type && "border-destructive")}>
              <SelectValue placeholder={t("dev.form_type_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {deviceTypeList.map((dt) => (
                <SelectItem key={dt.id} value={dt.id}>{lang === "ar" ? dt.name_ar : dt.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.device_type && <p className="text-xs text-destructive">{errors.device_type}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("dev.bulk_branch")} *</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className={cn(errors.branch && "border-destructive")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{lang === "ar" ? b.name_ar : b.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.branch && <p className="text-xs text-destructive">{errors.branch}</p>}
        </div>

        {preview.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label className="text-xs text-muted-foreground">{t("dev.bulk_preview")}</Label>
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {preview.slice(0, 12).map((name) => (
                <span key={name} className="font-mono text-xs bg-muted rounded px-2 py-0.5">{name}</span>
              ))}
              {preview.length > 12 && (
                <span className="text-xs text-muted-foreground self-center">+{preview.length - 12}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
