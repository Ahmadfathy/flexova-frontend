import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Info } from "lucide-react";

import { DrawerShell } from "@/components/patterns/DrawerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useMfgOrders } from "@/stores/mfgOrders";
import { getItems, getWarehouses, getBomTemplates } from "@/lib/mock/mfg";
import type { BomComponent, MoStage, MfgOverhead } from "@/types/mfg";

interface EditableLine extends BomComponent {
  _key: string;
}

type Mode = "template" | "free";
type IssueMode = "backflush" | "manual";

function emptyOverhead(): MfgOverhead {
  return { method: "percent_materials", value: 0, computed: 0 };
}

/** /mfg/orders/new — route-mounted drawer (FE_14 §6). Closing navigates back to the list. */
export function MoEditorPage() {
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const can = useCan();
  const createOrder = useMfgOrders((s) => s.createOrder);

  const items = useMemo(() => getItems(), []);
  const warehouses = useMemo(() => getWarehouses(), []);
  const bomTemplates = useMemo(() => getBomTemplates(), []);
  const manufacturedItems = useMemo(() => items.filter((i) => i.item_type === "manufactured"), [items]);

  const defaultRaw = warehouses.find((w) => w.id === "wh_raw") ?? warehouses.find((w) => w.type === "storage");
  const defaultWip = warehouses.find((w) => w.id === "wh_wip") ?? warehouses.find((w) => w.type === "wip");
  const defaultFinished = warehouses.find((w) => w.id === "wh_finished")
    ?? warehouses.filter((w) => w.type === "storage")[1];

  const [product, setProduct] = useState(searchParams.get("product") ?? "");
  const [qty, setQty] = useState("");
  const [mode, setMode] = useState<Mode>("template");
  const [templateId, setTemplateId] = useState("");
  const [customerOrderRef, setCustomerOrderRef] = useState("");
  const [whRaw, setWhRaw] = useState(defaultRaw?.id ?? "");
  const [whWip, setWhWip] = useState(defaultWip?.id ?? "");
  const [whFinished, setWhFinished] = useState(defaultFinished?.id ?? "");
  const [issueMode, setIssueMode] = useState<IssueMode>("backflush");
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [stages, setStages] = useState<MoStage[]>([]);
  const [overhead, setOverhead] = useState<MfgOverhead>(emptyOverhead());
  const [newLineItem, setNewLineItem] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const templatesForProduct = useMemo(
    () => bomTemplates.filter((bt) => bt.output_item_id === product),
    [bomTemplates, product]
  );

  function itemName(id: string) {
    const item = items.find((i) => i.id === id);
    return item ? (lang === "ar" ? item.name_ar : item.name_en) : id;
  }
  function isManufactured(id: string) {
    return items.find((i) => i.id === id)?.item_type === "manufactured";
  }

  // Reset the BOM/stages/overhead whenever the product changes — a template for a
  // different output item can't stay applied (FE_14 §11.4: never a live template ref).
  useEffect(() => {
    setTemplateId("");
    setLines([]);
    setStages([]);
    setOverhead(emptyOverhead());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = bomTemplates.find((bt) => bt.id === id);
    if (!template) return;
    // Deep-copy every field — this becomes the MO's own frozen Order BOM; the
    // template object itself (and its `components` array) is never touched again.
    setLines(template.components.map((c) => ({ ...c, _key: crypto.randomUUID() })));
    setStages(template.stages_template.map((name, i) => ({
      id: `st_${i + 1}`, name_ar: name, order: i + 1,
      assignee_id: null, status: "pending", started_at: null, ended_at: null,
    })));
    setOverhead({ ...template.overhead_default, computed: 0 });
  }

  function handleModeChange(next: Mode) {
    setMode(next);
    setTemplateId("");
    setLines([]);
    setStages([]);
    setOverhead(emptyOverhead());
  }

  function patchLine(key: string, patch: Partial<EditableLine>) {
    setLines((ls) => ls.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  }
  function removeLine(key: string) {
    setLines((ls) => ls.filter((l) => l._key !== key));
  }
  function addLine() {
    if (!newLineItem) return;
    const item = items.find((i) => i.id === newLineItem);
    if (!item) return;
    setLines((ls) => [...ls, {
      _key: crypto.randomUUID(), item_id: item.id, qty: 0, uom: item.base_uom, expected_scrap_pct: 0,
    }]);
    setNewLineItem("");
  }

  const semiFinishedLines = lines.filter((l) => isManufactured(l.item_id));

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!product) e.product = t("new.product_required");
    const qtyNum = parseFloat(qty);
    if (!qty || isNaN(qtyNum) || qtyNum <= 0) e.qty = t("new.qty_required");
    if (lines.length === 0) e.lines = t("new.lines_required");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const order_bom: BomComponent[] = lines.map(({ _key, ...line }) => line);
    const mo = createOrder({
      output_item_id: product,
      qty_ordered: parseFloat(qty),
      source_template_id: mode === "template" ? (templateId || null) : null,
      customer_order_id: customerOrderRef.trim() || null,
      wh_raw: whRaw,
      wh_wip: whWip,
      wh_finished: whFinished,
      issue_mode: issueMode,
      order_bom,
      stages,
      overhead,
    });
    toast.success(t("new.saved_toast", { number: mo.number }));
    navigate("/mfg/orders");
  }

  function handleClose() {
    navigate("/mfg/orders");
  }

  if (!can("mfg.order.create")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("new.permission_required")}</p>
      </div>
    );
  }

  return (
    <DrawerShell
      open
      onOpenChange={(o) => !o && handleClose()}
      title={t("new.title")}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>{t("new.cancel")}</Button>
          <Button onClick={handleSave}>{t("new.save")}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Product + qty */}
        <div className="grid grid-cols-2 gap-3">
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
            <Label className="text-sm font-medium">{t("new.qty")} *</Label>
            <Input
              type="number" min={0} step={1} value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={cn(errors.qty && "border-destructive")}
            />
            {errors.qty && <p className="text-xs text-destructive">{errors.qty}</p>}
          </div>
        </div>

        {/* Template vs free */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("new.from_template")} / {t("new.build_free")}</Label>
          <Tabs value={mode} onValueChange={(v) => handleModeChange(v as Mode)}>
            <TabsList className="h-9 p-1 bg-muted">
              <TabsTrigger value="template" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {t("new.from_template")}
              </TabsTrigger>
              <TabsTrigger value="free" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {t("new.build_free")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "template" && (
            product ? (
              templatesForProduct.length > 0 ? (
                <Select value={templateId} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue placeholder={t("new.template_select")} /></SelectTrigger>
                  <SelectContent>
                    {templatesForProduct.map((bt) => (
                      <SelectItem key={bt.id} value={bt.id}>{lang === "ar" ? bt.name_ar : bt.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">{t("new.no_templates")}</p>
              )
            ) : null
          )}
        </div>

        {/* Linked customer order (optional — no sales-order picker exists in the mfg
            fixture set, so this is a free-text reference) */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("new.linked_order")}</Label>
          <Input value={customerOrderRef} onChange={(e) => setCustomerOrderRef(e.target.value)} placeholder={t("new.linked_order_placeholder")} />
        </div>

        {/* Warehouses */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("new.wh_raw")}</Label>
            <Select value={whRaw} onValueChange={setWhRaw}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("new.wh_wip")}</Label>
            <Select value={whWip} onValueChange={setWhWip}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("new.wh_finished")}</Label>
            <Select value={whFinished} onValueChange={setWhFinished}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{lang === "ar" ? w.name_ar : w.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Issue mode */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("new.issue_mode")}</Label>
          <Tabs value={issueMode} onValueChange={(v) => setIssueMode(v as IssueMode)}>
            <TabsList className="h-9 p-1 bg-muted">
              <TabsTrigger value="backflush" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {t("new.backflush")}
              </TabsTrigger>
              <TabsTrigger value="manual" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {t("new.manual")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Semi-finished banner(s) */}
        {semiFinishedLines.map((l) => (
          <div key={l._key} className="flex items-center gap-2 rounded border border-brand/30 bg-brand-tint px-4 py-3 text-sm text-brand-text">
            <Info className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              <strong>{itemName(l.item_id)}</strong> — {t("new.semi_finished_banner")}
            </span>
            <button
              onClick={() => navigate(`/mfg/orders/new?product=${l.item_id}`)}
              className="text-brand-text font-medium underline underline-offset-2 shrink-0"
            >
              {t("new.semi_finished_link")}
            </button>
          </div>
        ))}

        {/* Order BOM table */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("new.bom_title")}</Label>
          {errors.lines && <p className="text-xs text-destructive">{errors.lines}</p>}

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
                {lines.map((l) => (
                  <tr key={l._key} className="border-t border-border">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        {itemName(l.item_id)}
                        {isManufactured(l.item_id) && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-brand/40 text-brand-text bg-brand-tint">
                            {t("new.semi_finished_tag")}
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number" min={0} step={0.01} value={l.qty}
                        onChange={(e) => patchLine(l._key, { qty: parseFloat(e.target.value) || 0 })}
                        className="h-8"
                      />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{l.uom}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number" min={0} max={100} step={1} value={l.expected_scrap_pct}
                        onChange={(e) => patchLine(l._key, { expected_scrap_pct: parseFloat(e.target.value) || 0 })}
                        className="h-8"
                      />
                    </td>
                    <td className="px-1 py-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeLine(l._key)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <Select value={newLineItem} onValueChange={setNewLineItem}>
              <SelectTrigger className="flex-1"><SelectValue placeholder={t("new.item_select_placeholder")} /></SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {lang === "ar" ? i.name_ar : i.name_en}
                    {i.item_type === "manufactured" ? ` (${t("new.semi_finished_tag")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={addLine} disabled={!newLineItem}>
              <Plus className="h-4 w-4 me-1.5" />
              {t("new.add_line")}
            </Button>
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
