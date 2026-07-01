import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Label }  from "@/components/ui/label";
import { ModalShell } from "@/components/patterns/ModalShell";
import { DatePicker } from "@/components/patterns/DatePicker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Loader2, Snowflake, Activity } from "lucide-react";

import { cn }     from "@/lib/utils";
import { useItems } from "../items/useItems";

/* ─── Helpers ────────────────────────────────────────────────── */

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

/* ─── Props ──────────────────────────────────────────────────── */

interface NewStocktakeDialogProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
}

/* ─── Component ──────────────────────────────────────────────── */

export function NewStocktakeDialog({ open, onOpenChange }: NewStocktakeDialogProps) {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const navigate     = useNavigate();
  const { data }     = useItems();

  const warehouses = data?.warehouses ?? [];

  const [form, setForm] = useState({
    warehouse_id: "",
    date:         todayIso(),
    mode:         "live" as "freeze" | "live",
  });
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ warehouse_id: "", date: todayIso(), mode: "live" });
      setErrors({});
      setSaving(false);
    }
  }, [open]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.warehouse_id) e.warehouse_id = t("stocktakes.wh_required");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onOpenChange(false);
    /* Navigate to the fixture's existing counting stocktake (st_0007) as a
       stand-in for the newly created one in the mock layer */
    navigate(`/inventory/stocktakes/st_0007`, {
      state: {
        draftWarehouse: form.warehouse_id,
        draftDate:      form.date,
        draftMode:      form.mode,
      },
    });
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("stocktakes.new_title")}
      description={t("stocktakes.new")}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {t("stocktakes.new")}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          {/* Warehouse */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("stocktakes.form_warehouse")} *</Label>
            <Select
              value={form.warehouse_id}
              onValueChange={v => { setForm(f => ({ ...f, warehouse_id: v })); setErrors({}); }}
            >
              <SelectTrigger className={cn(errors.warehouse_id && "border-destructive")}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(wh => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {lang === "ar" ? wh.name_ar : wh.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.warehouse_id && (
              <p className="text-xs text-destructive">{errors.warehouse_id}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("stocktakes.form_date")}</Label>
            <DatePicker
              value={form.date}
              onChange={val => setForm(f => ({ ...f, date: val }))}
            />
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("stocktakes.form_mode")} *</Label>
            <RadioGroup
              value={form.mode}
              onValueChange={v => setForm(f => ({ ...f, mode: v as "freeze" | "live" }))}
              className="gap-3"
            >
              {(["live", "freeze"] as const).map(mode => {
                const Icon = mode === "freeze" ? Snowflake : Activity;
                return (
                  <label
                    key={mode}
                    className={cn(
                      "flex items-start gap-3 rounded border p-3 cursor-pointer transition-colors",
                      form.mode === mode
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <RadioGroupItem value={mode} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-sm font-medium">
                          {t(`stocktakes.mode_${mode}`)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`stocktakes.mode_${mode}_hint`)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        </div>
    </ModalShell>
  );
}
