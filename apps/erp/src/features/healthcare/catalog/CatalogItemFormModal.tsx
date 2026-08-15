import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHealthcareCatalog } from "@/stores/healthcareCatalog";
import { getProviders, providerName } from "@/lib/mock/healthcare";
import { useAppearance } from "@/stores/appearance";
import type { HcCatalogItem } from "@/features/healthcare/types";

interface CatalogItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: HcCatalogItem;
}

const EMPTY = { name: "", type: "lab" as HcCatalogItem["type"], price: "", providerId: "" };

/** Add/edit catalog item (spec §9.2). */
export function CatalogItemFormModal({ open, onOpenChange, editingItem }: CatalogItemFormModalProps) {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const addItem = useHealthcareCatalog((s) => s.addItem);
  const updateItem = useHealthcareCatalog((s) => s.updateItem);
  const providers = getProviders();

  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editingItem) {
      setForm({ name: editingItem.name_ar, type: editingItem.type, price: String(editingItem.price), providerId: editingItem.default_provider });
    } else if (open) {
      setForm(EMPTY);
    }
  }, [editingItem, open]);

  function handleSave() {
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error(t("catalog.item_missing_fields"));
      return;
    }
    const payload = { name_ar: form.name.trim(), type: form.type, price, default_provider: form.providerId };
    if (editingItem) updateItem(editingItem.id, payload);
    else addItem(payload);
    toast.success(t(editingItem ? "catalog.item_updated" : "catalog.item_added"));
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={editingItem ? t("catalog.edit_item") : t("catalog.new_item")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSave}>{t("common:save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("catalog.field_name")}</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("catalog.field_type")}</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as HcCatalogItem["type"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consult">{t("catalog.type_consult")}</SelectItem>
                <SelectItem value="lab">{t("catalog.type_lab")}</SelectItem>
                <SelectItem value="radiology">{t("catalog.type_radiology")}</SelectItem>
                <SelectItem value="procedure">{t("catalog.type_procedure")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("catalog.field_price")}</Label>
            <Input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} inputMode="decimal" className="tabular-nums" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t("catalog.field_default_provider")}</Label>
          <Select value={form.providerId || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, providerId: v === "__none__" ? "" : v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {providers.map((p) => <SelectItem key={p.id} value={p.id}>{providerName(p, lang)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ModalShell>
  );
}
