/**
 * DD-1 — Item Editor (inventory.frontend.md §3, "Reality correction": v1 has no
 * tabbed item detail page, so this is a NEW surface introduced by DD-1 to host
 * the Variants section + Matrix grid; simple items also get Basic/Pricing/Stock/
 * Ledger tabs here for the first time, since none of that existed as a page to
 * extend). Reached from an Items-list row "edit" action, or from QuickAddModal
 * after creating a has_variants product (it still stays the fast-create path).
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, Loader2, Flag } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Switch }  from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { isFlagEnabled } from "@/lib/flags";
import { useCan } from "@/lib/permissions";
import { useItems } from "./useItems";
import { VariantsSection, type MatrixRowVM } from "./VariantsSection";
import { VariantQuickEditDrawer } from "./VariantQuickEditDrawer";
import {
  cartesianCombos, comboKey, generateVariantCode, generateVariants, computeRollup,
  projectedComboCount, MAX_COMBOS, type GenerateVariantsInput,
} from "./variants";
import { BatchSection } from "./BatchSection";
import type { InventoryAttributeValue, InventoryVariant } from "./types";

type TabKey = "basic" | "pricing" | "stock" | "variants" | "batch" | "ledger";

function buildRows(
  attributeOrder: string[],
  valueSelections: Record<string, string[]>,
  existingVariants: InventoryVariant[],
  attributeValues: InventoryAttributeValue[],
  parentCode: string,
  priorRows: MatrixRowVM[]
): MatrixRowVM[] {
  const valueSets = attributeOrder.map((attrId) => ({ attributeId: attrId, valueIds: valueSelections[attrId] ?? [] }));
  const combos = cartesianCombos(valueSets);
  const existingByKey = new Map(existingVariants.map((v) => [comboKey(v.attrs), v]));
  const priorByKey = new Map(priorRows.map((r) => [r.key, r]));

  return combos.map((combo) => {
    const key = comboKey(combo);
    const prior = priorByKey.get(key);
    if (prior) return prior;

    const existing = existingByKey.get(key);
    if (existing) {
      return {
        key, combo, included: true, isNew: false, variantId: existing.id,
        code: existing.code, barcode: existing.barcodes[0] ?? "",
        price: String(existing.prices["pl_retail"] ?? Object.values(existing.prices)[0] ?? ""),
        reorderLevel: existing.reorder_level !== null ? String(existing.reorder_level) : "",
        status: existing.status, openingByWarehouse: {},
        existingBalanceTotal: existing.balances.reduce((s, b) => s + b.qty, 0),
      };
    }
    return {
      key, combo, included: true, isNew: true,
      code: generateVariantCode(parentCode, combo, attributeOrder, attributeValues),
      barcode: "", price: "", reorderLevel: "", status: "active", openingByWarehouse: {},
    };
  });
}

export function ItemEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation("inventory");
  const lang = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const can = useCan();
  const flagOn = isFlagEnabled("inventory.variants");
  const batchFlagOn = isFlagEnabled("inventory.batch_expiry");

  const { data, loading, error, isOffline, reload, mutate } = useItems();
  const item = useMemo(() => data?.items.find((i) => i.id === id), [data, id]);

  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [formInit, setFormInit] = useState(false);

  // Basic
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [baseUomId, setBaseUomId] = useState("");
  const [taxTypeId, setTaxTypeId] = useState("");
  const [etaCode, setEtaCode] = useState("");
  const [hasVariants, setHasVariants] = useState(false);

  // Simple-mode pricing/stock
  const [salePrice, setSalePrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [maxLevel, setMaxLevel] = useState("");

  // DD-2 — Batch/Expiry section (§2.1)
  const [tracksBatch, setTracksBatch] = useState(false);
  const [requiresExpiry, setRequiresExpiry] = useState(true);
  const [nearExpiryDaysStr, setNearExpiryDaysStr] = useState("");

  // Variants mode
  const [attributeOrder, setAttributeOrder] = useState<string[]>([]);
  const [valueSelections, setValueSelections] = useState<Record<string, string[]>>({});
  const [rows, setRows] = useState<MatrixRowVM[]>([]);

  const [ledgerVariant, setLedgerVariant] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [quickEditRow, setQuickEditRow] = useState<MatrixRowVM | null>(null);

  const attributes = data?.attributes ?? [];
  const attributeValues = data?.attribute_values ?? [];
  const warehouses = data?.warehouses ?? [];
  const categories = data?.categories ?? [];
  const uoms = data?.uoms ?? [];
  const taxTypes = data?.tax_types ?? [];
  const ledger = data?.ledger ?? [];

  /* ── Init draft once the item loads ─────────────────────────── */
  useEffect(() => {
    if (!item || formInit) return;
    setNameAr(item.name_ar);
    setNameEn(item.name_en);
    setCategoryId(item.category_id);
    setBaseUomId(item.base_uom_id);
    setTaxTypeId(item.tax_type_id);
    setEtaCode(item.eta_code ?? "");
    setHasVariants(!!item.has_variants_flag);
    setSalePrice(String(item.prices["pl_retail"] ?? Object.values(item.prices)[0] ?? ""));
    setBarcode(item.barcodes[0] ?? "");
    setReorderLevel(item.reorder_level !== null ? String(item.reorder_level) : "");
    setMaxLevel(item.max_level !== null ? String(item.max_level) : "");
    setTracksBatch(!!item.tracks_batch);
    setRequiresExpiry(item.requires_expiry !== false);
    setNearExpiryDaysStr(item.near_expiry_days != null ? String(item.near_expiry_days) : "");

    const attrOrder = item.attributes_used ?? [];
    const valSel: Record<string, string[]> = {};
    for (const attrId of attrOrder) {
      valSel[attrId] = Array.from(new Set((item.variants ?? []).map((v) => v.attrs[attrId]).filter(Boolean)));
    }
    setAttributeOrder(attrOrder);
    setValueSelections(valSel);
    setRows(buildRows(attrOrder, valSel, item.variants ?? [], attributeValues, item.code, []));
    setFormInit(true);
  }, [item, formInit, attributeValues]);

  /* ── Recompute matrix rows when the picker changes ───────────── */
  const pickerKey = attributeOrder.join(",") + "|" + attributeOrder.map((a) => (valueSelections[a] ?? []).join(",")).join(";");
  useEffect(() => {
    if (!formInit || !item) return;
    // DD-1 §3.5 — combo_explosion blocks GENERATE, not just save: don't even
    // build/render an oversized grid, so the browser never has to lay out
    // hundreds of rows the guard would reject anyway.
    const projected = projectedComboCount(attributeOrder.map((a) => ({ attributeId: a, valueIds: valueSelections[a] ?? [] })));
    if (projected > MAX_COMBOS) { setRows([]); return; }
    setRows((prev) => buildRows(attributeOrder, valueSelections, item.variants ?? [], attributeValues, item.code, prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerKey, formInit]);

  /* ── Values that can't be unselected (movement-bearing variant) ─ */
  const blockedValueIds = useMemo(() => {
    const set = new Set<string>();
    for (const v of item?.variants ?? []) {
      const hasMovement = ledger.some((m) => m.variant_id === v.id);
      if (!hasMovement) continue;
      for (const valId of Object.values(v.attrs)) set.add(valId);
    }
    return set;
  }, [item, ledger]);

  /* ── Guard: block converting an item with real history (D8 — migration is
     deferred; never silently drop a balance/ledger to flip modes) ─────── */
  const originalHasVariants = !!item?.has_variants_flag;
  const simpleItemHasHistory =
    !originalHasVariants &&
    !!item &&
    (item.balances.some((b) => b.qty !== 0) || ledger.some((m) => m.item_id === item.id && !m.variant_id));
  const productVariantsHaveMovements =
    originalHasVariants && (item?.variants ?? []).some((v) => ledger.some((m) => m.variant_id === v.id));
  const toggleLocked = simpleItemHasHistory || productVariantsHaveMovements;

  const canManageVariants = can("inventory.item.variants");

  // DD-2 — never silently drop a batch's history by flipping tracks_batch off
  // (same golden-rule spirit as the DD-1 has_variants toggleLocked guard above).
  const originalTracksBatch = !!item?.tracks_batch;
  const batchToggleLocked = originalTracksBatch && ledger.some((m) => m.item_id === item?.id && !!m.batch_id);

  // DD-1 addendum — rows whose effective eta_code (own override, else the
  // parent's draft base) is empty; warning-only, shown next to the combo.
  const etaMissingRowKeys = useMemo(() => {
    const set = new Set<string>();
    if (!data?._meta.tenant.eta_enabled) return set;
    for (const row of rows) {
      const override = item?.variants?.find((v) => v.id === row.variantId)?.eta_code ?? null;
      if (!(override || etaCode)) set.add(row.key);
    }
    return set;
  }, [rows, item, etaCode, data]);

  function handleAddValueToAttribute(attrId: string, ar: string, en: string): InventoryAttributeValue | null {
    const attr = attributes.find((a) => a.id === attrId);
    if (!attr) return null;
    const confirmed = window.confirm(
      `${t("variants.add_value_inline")} — "${ar}" ${lang === "ar" ? "في" : "in"} ${lang === "ar" ? attr.name_ar : attr.name_en}?`
    );
    if (!confirmed) return null;
    const created: InventoryAttributeValue = {
      id: `av_new_${Date.now()}`,
      attribute_id: attrId,
      value_ar: ar,
      value_en: en || ar,
      swatch_hex: attr.type === "color" ? "#999999" : null,
      sort_order: attributeValues.filter((v) => v.attribute_id === attrId).length + 1,
    };
    mutate((prev) => prev && { ...prev, attribute_values: [...prev.attribute_values, created] });
    return created;
  }

  /* ── Variant quick-edit drawer (DD-1 §3.6, from a matrix row's "edit") ── */
  const quickEditVariant = quickEditRow
    ? (item?.variants ?? []).find((v) => v.id === quickEditRow.variantId) ?? null
    : null;

  function handleQuickEditSave(variantId: string, patch: Partial<InventoryVariant>) {
    mutate((prev) => {
      if (!prev || !item) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.id === item.id
            ? { ...it, variants: it.variants?.map((v) => (v.id === variantId ? { ...v, ...patch } : v)) }
            : it
        ),
      };
    });
    // reflect the override in the still-open matrix grid immediately
    setRows((rs) => rs.map((r) => r.variantId === variantId ? {
      ...r,
      barcode: patch.barcodes?.[0] ?? r.barcode,
      price: patch.prices?.["pl_retail"] !== undefined ? String(patch.prices["pl_retail"]) : r.price,
      reorderLevel: patch.reorder_level !== undefined ? (patch.reorder_level !== null ? String(patch.reorder_level) : "") : r.reorderLevel,
      status: patch.status ?? r.status,
    } : r));
  }

  /* ── Save ─────────────────────────────────────────────────────*/
  async function handleSave() {
    if (!item || !data) return;
    setSaveError("");

    if (hasVariants) {
      if (!canManageVariants) return;

      const genInput: GenerateVariantsInput = {
        itemId: item.id,
        parentCode: item.code,
        attributeOrder,
        valueSets: attributeOrder.map((a) => ({ attributeId: a, valueIds: valueSelections[a] ?? [] })),
        excludedKeys: new Set(rows.filter((r) => !r.included).map((r) => r.key)),
        attributeValues,
        existing: item.variants ?? [],
        overrides: Object.fromEntries(
          rows.filter((r) => r.included).map((r) => {
            const priorPrices = item.variants?.find((v) => v.id === r.variantId)?.prices ?? {};
            return [r.key, {
              code: r.code,
              prices: r.price ? { ...priorPrices, pl_retail: parseFloat(r.price) || 0 } : priorPrices,
              reorder_level: r.reorderLevel ? parseFloat(r.reorderLevel) : null,
              barcodes: r.barcode ? [r.barcode] : [],
              opening: r.isNew
                ? Object.entries(r.openingByWarehouse)
                    .filter(([, q]) => q && parseFloat(q) > 0)
                    .map(([wh, q]) => ({ warehouse_id: wh, qty: parseFloat(q), cost: parseFloat(r.price) || 0 }))
                : undefined,
            }];
          })
        ),
        allItems: data.items,
      };

      const result = generateVariants(genInput);
      if (!result.ok) {
        setActiveTab("variants");
        if (result.reason === "combo_explosion") setSaveError(t("variants.combo_explosion"));
        else if (result.reason === "duplicate_code") setSaveError(t("variants.duplicate_code", { code: result.detail }));
        else setSaveError(t("variants.need_one_included"));
        return;
      }

      // carry the row's suspend/activate choice onto the generated variant
      const variantsWithStatus = result.variants.map((v) => {
        const row = rows.find((r) => r.key === comboKey(v.attrs));
        return row ? { ...v, status: row.status } : v;
      });
      const rollup = computeRollup(variantsWithStatus);

      setSaving(true);
      mutate((prev) => prev && {
        ...prev,
        items: prev.items.map((i) => i.id === item.id ? {
          ...i,
          name_ar: nameAr, name_en: nameEn, category_id: categoryId, base_uom_id: baseUomId,
          tax_type_id: taxTypeId, eta_code: etaCode,
          is_product_parent: true, has_variants_flag: true,
          attributes_used: attributeOrder,
          variants: variantsWithStatus, rollup,
          prices: {}, barcodes: [],
          tracks_batch: tracksBatch,
          requires_expiry: tracksBatch ? requiresExpiry : undefined,
          near_expiry_days: nearExpiryDaysStr ? parseFloat(nearExpiryDaysStr) : null,
        } : i),
        ledger: [...prev.ledger, ...result.openingMovements],
      });
      setSaving(false);
      toast.success(t("item_editor.saved_toast"));
      navigate("/inventory/items");
      return;
    }

    // ── Simple item save ──
    setSaving(true);
    mutate((prev) => prev && {
      ...prev,
      items: prev.items.map((i) => i.id === item.id ? {
        ...i,
        name_ar: nameAr, name_en: nameEn, category_id: categoryId, base_uom_id: baseUomId,
        tax_type_id: taxTypeId, eta_code: etaCode,
        is_product_parent: false, has_variants_flag: false,
        attributes_used: undefined, variants: undefined, rollup: undefined,
        prices: { ...i.prices, pl_retail: parseFloat(salePrice) || 0 },
        barcodes: barcode ? [barcode] : [],
        reorder_level: reorderLevel ? parseFloat(reorderLevel) : null,
        max_level: maxLevel ? parseFloat(maxLevel) : null,
        tracks_batch: tracksBatch,
        requires_expiry: tracksBatch ? requiresExpiry : undefined,
        near_expiry_days: nearExpiryDaysStr ? parseFloat(nearExpiryDaysStr) : null,
      } : i),
    });
    setSaving(false);
    toast.success(t("item_editor.saved_toast"));
    navigate("/inventory/items");
  }

  /* ── Ledger rows for the active filter ───────────────────────── */
  const itemLedgerRows = useMemo(() => {
    if (!item) return [];
    let rowsL = ledger.filter((m) => m.item_id === item.id);
    if (hasVariants && ledgerVariant !== "all") rowsL = rowsL.filter((m) => m.variant_id === ledgerVariant);
    return [...rowsL].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [ledger, item, hasVariants, ledgerVariant]);

  /* ── Loading / error / not-found states ──────────────────────── */
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("item_editor.title_edit")} />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error && !isOffline) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("item_editor.title_edit")} />
        <ErrorState description={t("errors.load")} onRetry={reload} />
      </div>
    );
  }
  if (data && !item) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("item_editor.title_edit")} />
        <EmptyState
          title={t("item_editor.not_found")}
          description={t("item_editor.not_found")}
          action={{ label: t("item_editor.back_to_list"), onClick: () => navigate("/inventory/items") }}
        />
      </div>
    );
  }
  if (!item) return null;

  const showVariantsTab = hasVariants && flagOn;
  const showBatchTab = batchFlagOn && tracksBatch;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("item_editor.title_edit")}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate("/inventory/items")}>
            <ArrowRight className="h-4 w-4 me-1.5 rtl:rotate-180" />
            {t("item_editor.back_to_list")}
          </Button>
        }
        alert={isOffline ? <OfflineBanner message={t("offline.banner")} /> : undefined}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="min-h-9 p-1 bg-muted flex-wrap">
          <TabsTrigger value="basic" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("item_editor.tab_basic")}
          </TabsTrigger>
          <TabsTrigger value="pricing" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("item_editor.tab_pricing")}
          </TabsTrigger>
          <TabsTrigger value="stock" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("item_editor.tab_stock")}
          </TabsTrigger>
          {showVariantsTab && (
            <TabsTrigger value="variants" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              {t("item_editor.tab_variants")}
            </TabsTrigger>
          )}
          {showBatchTab && (
            <TabsTrigger value="batch" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              {t("item_editor.tab_batch")}
            </TabsTrigger>
          )}
          <TabsTrigger value="ledger" className="h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t("item_editor.tab_ledger")}
          </TabsTrigger>
        </TabsList>

        {/* ── Basic ─────────────────────────────────────────── */}
        <TabsContent value="basic" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("quickadd.name_ar")}</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("attributes.form_name_en")}</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("quickadd.category")}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{lang === "ar" ? c.name_ar : c.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("quickadd.unit")}</Label>
              <Select value={baseUomId} onValueChange={setBaseUomId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {uoms.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{lang === "ar" ? u.name_ar : u.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {flagOn && item.item_type === "stocked" && (
            <div className="flex items-start gap-3 rounded-md border border-border p-3 pt-3">
              <Switch
                id="has-variants"
                checked={hasVariants}
                disabled={!canManageVariants || toggleLocked}
                onCheckedChange={setHasVariants}
              />
              <div className="space-y-0.5">
                <Label htmlFor="has-variants" className="cursor-pointer">{t("item_editor.has_variants_toggle")}</Label>
                {toggleLocked && (
                  <p className="text-xs text-muted-foreground">{t("item_editor.migration_blocked")}</p>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Pricing & Tax ─────────────────────────────────── */}
        <TabsContent value="pricing" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label>{t("item_editor.tax_type_label")}</Label>
            <Select value={taxTypeId} onValueChange={setTaxTypeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {taxTypes.map((tx) => (
                  <SelectItem key={tx.id} value={tx.id}>{lang === "ar" ? tx.name_ar : tx.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 max-w-xs">
            <Label>{t("item_editor.eta_code_label")}</Label>
            <Input value={etaCode} onChange={(e) => setEtaCode(e.target.value)} placeholder="EG-..." className="tabular-nums" />
            {!!data?._meta.tenant.eta_enabled && !hasVariants && !etaCode && (
              <p className="flex items-center gap-1 text-xs text-warning-text">
                <Flag className="h-3 w-3 shrink-0" />
                {t("items.eta_missing_hint")}
              </p>
            )}
          </div>

          {hasVariants ? (
            <div className="rounded-md border border-dashed border-border p-4 space-y-2">
              <p className="text-sm text-muted-foreground">{t("item_editor.price_managed_note")}</p>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("variants")}>
                {t("item_editor.price_managed_link")}
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5 max-w-xs">
              <Label>{t("quickadd.price")}</Label>
              <Input type="number" min={0} className="tabular-nums" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
          )}
        </TabsContent>

        {/* ── Stock ─────────────────────────────────────────── */}
        <TabsContent value="stock" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-4">
          {hasVariants ? (
            <div className="space-y-3">
              <div className="rounded-md border border-dashed border-border p-4 space-y-2">
                <p className="text-sm text-muted-foreground">{t("item_editor.stock_managed_note")}</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("variants")}>
                  {t("item_editor.stock_managed_link")}
                </Button>
              </div>
              {item.rollup && (
                <p className="text-sm tabular-nums text-muted-foreground">
                  {t("variants.rollup_hint")}: <span className="font-medium text-foreground">{item.rollup.balance_total}</span>
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div className="space-y-1.5">
                  <Label>{t("columns.reorder")}</Label>
                  <Input type="number" min={0} className="tabular-nums" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("item_editor.max_level_label")}</Label>
                  <Input type="number" min={0} className="tabular-nums" value={maxLevel} onChange={(e) => setMaxLevel(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5 max-w-md">
                <Label>{t("variants.barcode")}</Label>
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="tabular-nums" />
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {item.balances.map((b) => {
                  const wh = warehouses.find((w) => w.id === b.warehouse_id);
                  return (
                    <div key={b.warehouse_id} className="flex items-center justify-between max-w-xs">
                      <span>{lang === "ar" ? wh?.name_ar : wh?.name_en}</span>
                      <span className="tabular-nums">{b.qty}</span>
                    </div>
                  );
                })}
              </div>

              {/* DD-2 §2.1 — Batch/Expiry section */}
              {batchFlagOn && (
                <div className="rounded-md border border-border p-3 space-y-3 max-w-md">
                  <div className="flex items-start gap-3">
                    <Switch
                      id="tracks-batch"
                      checked={tracksBatch}
                      disabled={batchToggleLocked}
                      onCheckedChange={setTracksBatch}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="tracks-batch" className="cursor-pointer">{t("batch.tracks_batch")}</Label>
                      {batchToggleLocked && (
                        <p className="text-xs text-muted-foreground">{t("item_editor.migration_blocked")}</p>
                      )}
                    </div>
                  </div>

                  {tracksBatch && (
                    <>
                      <div className="flex items-start gap-3">
                        <Switch id="requires-expiry" checked={requiresExpiry} onCheckedChange={setRequiresExpiry} />
                        <Label htmlFor="requires-expiry" className="cursor-pointer">{t("batch.requires_expiry")}</Label>
                      </div>
                      <div className="space-y-1.5 max-w-[10rem]">
                        <Label>{t("batch.near_expiry_days")}</Label>
                        <Input
                          type="number" min={0} className="tabular-nums"
                          placeholder={String(data?.settings?.global_near_expiry_days ?? 30)}
                          value={nearExpiryDaysStr}
                          onChange={(e) => setNearExpiryDaysStr(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Variants ──────────────────────────────────────── */}
        {showVariantsTab && (
          <TabsContent value="variants" className="rounded-lg border border-border bg-card p-4 mt-3">
            <VariantsSection
              lang={lang}
              can={can}
              attributes={attributes}
              attributeValues={attributeValues}
              warehouses={warehouses}
              attributeOrder={attributeOrder}
              onAttributeOrderChange={setAttributeOrder}
              valueSelections={valueSelections}
              onValueSelectionsChange={(attrId, ids) => setValueSelections((s) => ({ ...s, [attrId]: ids }))}
              rows={rows}
              onRowsChange={setRows}
              onAddValueToAttribute={handleAddValueToAttribute}
              blockedValueIds={blockedValueIds}
              onQuickEditRow={setQuickEditRow}
              etaMissingRowKeys={etaMissingRowKeys}
            />
            {saveError && <p className="text-sm text-destructive mt-3">{saveError}</p>}
          </TabsContent>
        )}

        {/* ── Batches (DD-2 §2.2) ──────────────────────────────── */}
        {showBatchTab && data && (
          <TabsContent value="batch" className="rounded-lg border border-border bg-card p-4 mt-3">
            <BatchSection item={item} warehouses={warehouses} data={data} lang={lang} can={can} mutate={mutate} />
          </TabsContent>
        )}

        {/* ── Ledger ────────────────────────────────────────── */}
        <TabsContent value="ledger" className="rounded-lg border border-border bg-card p-4 mt-3 space-y-3">
          {hasVariants && (
            <div className="max-w-xs space-y-1.5">
              <Label>{t("variants.ledger_variant")}</Label>
              <Select value={ledgerVariant} onValueChange={setLedgerVariant}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("variants.ledger_all")}</SelectItem>
                  {(item.variants ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {itemLedgerRows.length === 0 ? (
            <div className="py-8">
              <EmptyState title={t("ledger.empty_title")} description={t("ledger.empty_sub")} />
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground">{t("columns.date")}</th>
                    {hasVariants && ledgerVariant === "all" && (
                      <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground">{t("variants.code")}</th>
                    )}
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground">{t("columns.type")}</th>
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground">{t("ledger.col_source")}</th>
                    {tracksBatch && (
                      <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground">{t("batch.lot_number")}</th>
                    )}
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground">{t("filters.warehouse")}</th>
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground">{t("ledger.col_qty")}</th>
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground">{t("ledger.col_balance")}</th>
                    <th className="text-start px-3 py-2 text-xs font-medium text-muted-foreground">{t("ledger.col_cost")}</th>
                  </tr>
                </thead>
                <tbody>
                  {itemLedgerRows.map((m) => {
                    const wh = warehouses.find((w) => w.id === m.warehouse_id);
                    const typeKey = ({
                      opening: "type_opening", in: "type_in", out: "type_out", transfer: "type_transfer",
                      adjustment: "type_adj", stocktake: "type_stocktake",
                      receipt: "type_receipt", issue: "type_issue", transfer_in: "type_transfer_in", transfer_out: "type_transfer_out",
                    } as const)[m.type];
                    const batch = (data?.stock_batch ?? []).find((b) => b.id === m.batch_id);
                    return (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">{m.date}</td>
                        {hasVariants && ledgerVariant === "all" && (
                          <td className="px-3 py-2 tabular-nums text-xs">{m.variant_id ?? "—"}</td>
                        )}
                        <td className="px-3 py-2">{t(`ledger.${typeKey}`)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{m.source_ref}</td>
                        {tracksBatch && (
                          <td className="px-3 py-2 text-xs tabular-nums">{batch?.lot_number ?? "—"}</td>
                        )}
                        <td className="px-3 py-2 text-xs">{lang === "ar" ? wh?.name_ar : wh?.name_en}</td>
                        <td className={`px-3 py-2 tabular-nums ${m.qty < 0 ? "text-destructive" : ""}`}>{m.qty}</td>
                        <td className="px-3 py-2 tabular-nums">{m.running_balance}</td>
                        <td className="px-3 py-2 tabular-nums">{m.cost}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {saveError && activeTab !== "variants" && <p className="text-sm text-destructive">{saveError}</p>}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <Button variant="ghost" onClick={() => navigate("/inventory/items")} disabled={saving}>
          {t("item_editor.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
          {t("item_editor.save")}
        </Button>
      </div>

      <VariantQuickEditDrawer
        open={quickEditRow !== null}
        onOpenChange={(o) => !o && setQuickEditRow(null)}
        item={item}
        variant={quickEditVariant}
        priceLists={data?.price_lists ?? []}
        attributeValues={attributeValues}
        etaEnabled={!!data?._meta.tenant.eta_enabled}
        lang={lang}
        canEdit={canManageVariants}
        isOffline={isOffline}
        onSave={handleQuickEditSave}
      />
    </div>
  );
}
