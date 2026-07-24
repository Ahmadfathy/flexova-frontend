import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { ErrorState } from "@/components/patterns/ErrorState";
import { EmptyState } from "@/components/patterns/EmptyState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useMfgBomTemplates } from "@/stores/mfgBomTemplates";
import { getItems } from "@/lib/mock/mfg";
import type { BomComponent, MfgOverhead } from "@/types/mfg";
import { useBomDetail } from "./useBomDetail";

interface EditableComponent extends BomComponent {
  _key: string;
}

type TabKey = "basic" | "components";

export function BomEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const createTemplate = useMfgBomTemplates((s) => s.createTemplate);
  const updateTemplate = useMfgBomTemplates((s) => s.updateTemplate);

  const { template, notFound, loading, error, isOffline, reload } = useBomDetail(id ?? "");

  const items = useMemo(() => getItems(), []);
  const manufacturedItems = useMemo(() => items.filter((i) => i.item_type === "manufactured"), [items]);

  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [product, setProduct] = useState("");
  const [refQty, setRefQty] = useState("1");
  const [overheadMethod, setOverheadMethod] = useState<MfgOverhead["method"]>("percent_materials");
  const [overheadValue, setOverheadValue] = useState("0");
  const [components, setComponents] = useState<EditableComponent[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [newComponentItem, setNewComponentItem] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formInit, setFormInit] = useState(false);

  useEffect(() => {
    if (isNew || formInit) return;
    if (template) {
      setProduct(template.output_item_id);
      setRefQty(String(template.ref_qty));
      setOverheadMethod(template.overhead_default.method);
      setOverheadValue(String(template.overhead_default.value));
      setComponents(template.components.map((c) => ({ ...c, _key: crypto.randomUUID() })));
      setStages([...template.stages_template]);
      setFormInit(true);
    }
  }, [template, isNew, formInit]);

  function itemName(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    return item ? (lang === "ar" ? item.name_ar : item.name_en) : itemId;
  }
  function isManufactured(itemId: string) {
    return items.find((i) => i.id === itemId)?.item_type === "manufactured";
  }

  function patchComponent(key: string, patch: Partial<EditableComponent>) {
    setComponents((cs) => cs.map((c) => (c._key === key ? { ...c, ...patch } : c)));
  }
  function removeComponent(key: string) {
    setComponents((cs) => cs.filter((c) => c._key !== key));
  }
  function addComponent() {
    if (!newComponentItem) return;
    const item = items.find((i) => i.id === newComponentItem);
    if (!item) return;
    setComponents((cs) => [...cs, { _key: crypto.randomUUID(), item_id: item.id, qty: 0, uom: item.base_uom, expected_scrap_pct: 0 }]);
    setNewComponentItem("");
  }

  function addStage() {
    setStages((s) => [...s, ""]);
  }
  function patchStage(index: number, value: string) {
    setStages((s) => s.map((v, i) => (i === index ? value : v)));
  }
  function removeStage(index: number) {
    setStages((s) => s.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!product) e.product = t("bom.product_required");
    const refQtyNum = parseFloat(refQty);
    if (!refQty || isNaN(refQtyNum) || refQtyNum <= 0) e.ref_qty = t("bom.ref_qty_required");
    if (components.length === 0) e.components = t("bom.components_required");
    setErrors(e);
    if (Object.keys(e).length > 0) setActiveTab(e.product || e.ref_qty ? "basic" : "components");
    return Object.keys(e).length === 0;
  }

  function buildInput() {
    const outputItem = items.find((i) => i.id === product)!;
    return {
      output_item_id: product,
      name_ar: outputItem.name_ar,
      name_en: outputItem.name_en,
      ref_qty: parseFloat(refQty),
      overhead_default: { method: overheadMethod, value: parseFloat(overheadValue) || 0 },
      components: components.map(({ _key, ...c }) => c),
      stages_template: stages.map((s) => s.trim()).filter(Boolean),
    };
  }

  function handleSave() {
    if (!validate()) return;
    const input = buildInput();
    if (isNew) {
      const created = createTemplate(input);
      toast.success(t("bom.saved_toast"));
      navigate(`/mfg/bom/${created.id}`);
    } else {
      updateTemplate(id!, input);
      toast.success(t("bom.saved_toast"));
      navigate("/mfg/bom");
    }
  }

  function handleSaveAsCopy() {
    if (!validate()) return;
    const input = buildInput();
    const created = createTemplate(input);
    toast.success(t("bom.saved_as_copy_toast", { name: lang === "ar" ? created.name_ar : created.name_en }));
    navigate(`/mfg/bom/${created.id}`);
  }

  function handleCancel() {
    navigate("/mfg/bom");
  }

  if (!isNew) {
    if (loading) {
      return (
        <div className="space-y-4">
          <PageHeader title={t("bom.editor_title_edit")} />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="space-y-4">
          <PageHeader title={t("bom.editor_title_edit")} />
          <ErrorState title={t("bom.error_title")} description={t("bom.error_body")} onRetry={reload} />
        </div>
      );
    }
    if (notFound) {
      return (
        <div className="space-y-4">
          <PageHeader title={t("bom.editor_title_edit")} />
          <EmptyState
            title={t("bom.not_found_title")}
            description={t("bom.not_found_body")}
            action={{ label: t("bom.back_to_list"), onClick: () => navigate("/mfg/bom") }}
          />
        </div>
      );
    }
  }

  if (!can("mfg.bom.manage")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("bom.permission_required_manage")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={isNew ? t("bom.editor_title_new") : t("bom.editor_title_edit")}
        alert={isOffline ? <OfflineBanner message={t("bom.offline_note")} /> : undefined}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="h-9 p-1 bg-muted">
          <TabsTrigger value="basic" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("bom.tab_basic")}
          </TabsTrigger>
          <TabsTrigger value="components" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("bom.tab_components")}
          </TabsTrigger>
        </TabsList>

        {/* Basic */}
        <TabsContent value="basic" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("new.product")} *</Label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger className={cn(errors.product && "border-destructive")}>
                  <SelectValue placeholder={t("new.product_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {manufacturedItems.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{lang === "ar" ? i.name_ar : i.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.product && <p className="text-xs text-destructive">{errors.product}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("bom.ref_qty")} *</Label>
              <Input
                type="number" min={0} step={0.01} value={refQty}
                onChange={(e) => setRefQty(e.target.value)}
                className={cn(errors.ref_qty && "border-destructive")}
              />
              {errors.ref_qty && <p className="text-xs text-destructive">{errors.ref_qty}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("bom.overhead_method_label")}</Label>
              <Select value={overheadMethod} onValueChange={(v) => setOverheadMethod(v as MfgOverhead["method"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t("bom.overhead_method_fixed")}</SelectItem>
                  <SelectItem value="percent_materials">{t("bom.overhead_method_percent")}</SelectItem>
                  <SelectItem value="rate_hours">{t("bom.overhead_method_rate_hours")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("bom.overhead_value_label")}</Label>
              <Input type="number" min={0} step={0.01} value={overheadValue} onChange={(e) => setOverheadValue(e.target.value)} />
            </div>
          </div>
        </TabsContent>

        {/* Components & stages */}
        <TabsContent value="components" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("bom.components_title")}</Label>
            {errors.components && <p className="text-xs text-destructive">{errors.components}</p>}

            <div className="rounded border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground">{t("new.bom_col_item")}</th>
                    <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground w-24">{t("new.bom_col_qty")}</th>
                    <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground w-20">{t("new.bom_col_uom")}</th>
                    <th className="text-start px-3 py-2 font-medium text-xs text-muted-foreground w-28">{t("new.bom_col_scrap")}</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {components.map((c) => (
                    <tr key={c._key} className="border-t border-border">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1.5">
                          {itemName(c.item_id)}
                          {isManufactured(c.item_id) && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-brand/40 text-brand-text bg-brand-tint">
                              {t("new.semi_finished_tag")}
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min={0} step={0.01} value={c.qty}
                          onChange={(e) => patchComponent(c._key, { qty: parseFloat(e.target.value) || 0 })}
                          className="h-8"
                        />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{c.uom}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min={0} max={100} step={1} value={c.expected_scrap_pct}
                          onChange={(e) => patchComponent(c._key, { expected_scrap_pct: parseFloat(e.target.value) || 0 })}
                          className="h-8"
                        />
                      </td>
                      <td className="px-1 py-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeComponent(c._key)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2">
              <Select value={newComponentItem} onValueChange={setNewComponentItem}>
                <SelectTrigger className="flex-1"><SelectValue placeholder={t("new.item_select_placeholder")} /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {itemName(i.id)}{i.item_type === "manufactured" ? ` (${t("new.semi_finished_tag")})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={addComponent} disabled={!newComponentItem}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("new.add_line")}
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-border">
            <Label className="text-sm font-medium">{t("bom.stages")}</Label>
            <div className="space-y-2">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-5">{i + 1}.</span>
                  <Input value={s} onChange={(e) => patchStage(i, e.target.value)} placeholder={t("bom.stage_placeholder")} className="h-8" dir="rtl" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeStage(i)} aria-label={t("bom.stage_remove")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addStage}>
              <Plus className="h-4 w-4 me-1.5" />
              {t("bom.stage_add")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <Button variant="ghost" onClick={handleCancel}>{t("new.cancel")}</Button>
        {!isNew && (
          <Button variant="outline" onClick={handleSaveAsCopy}>{t("bom.save_as_copy")}</Button>
        )}
        <Button onClick={handleSave}>{t("bom.save")}</Button>
      </div>
    </div>
  );
}
