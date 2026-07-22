import { useState, useMemo, useEffect, Fragment } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2, Copy, AlertTriangle, Info, Save, Layers } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { getPriceLists, getPriceListLines, getItems, getUoms } from "@/lib/mock/wholesale";
import { validateTiers, clearPriceCache, type TierValidationError } from "@/lib/wholesale/pricing";
import type { PriceListLine, PriceTier } from "@/types/wholesale";
import { CopyTiersDialog } from "./CopyTiersDialog";

function fmtQty(n: number): string {
  return Number.isFinite(n) ? String(n) : "∞";
}

/** Price tiers editor (FE_13 §11) — extends FE_01 price lists with a per-item
 * expandable tier sub-table, live inline validation, and bulk "copy tiers to…". */
export function PriceTiersEditorPage() {
  const { id: priceListId } = useParams<{ id: string }>();
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();

  const priceList = useMemo(() => getPriceLists().find((pl) => pl.id === priceListId), [priceListId]);
  const uoms = useMemo(() => getUoms(), []);
  const allItems = useMemo(() => getItems(), []);
  const uomLabel = (uomId: string) =>
    (lang === "ar" ? uoms.find((u) => u.id === uomId)?.name_ar : uoms.find((u) => u.id === uomId)?.name_en) ?? uomId;

  const initialLines = useMemo(() => {
    const map: Record<string, PriceListLine> = {};
    if (priceListId) {
      for (const line of getPriceListLines()) {
        if (line.price_list_id === priceListId) {
          map[line.item_id] = { ...line, tiers: line.tiers.map((t) => ({ ...t })) };
        }
      }
    }
    return map;
  }, [priceListId]);

  const [lines, setLines] = useState<Record<string, PriceListLine>>(initialLines);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copyDialogItemId, setCopyDialogItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Route param can change without remounting this component — resync local state.
  useEffect(() => {
    setLines(initialLines);
    setExpanded(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceListId]);

  const itemsInList = useMemo(
    () => allItems.filter((it) => lines[it.id]),
    [allItems, lines],
  );

  function toggleExpand(itemId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }

  function updateLine(itemId: string, patch: Partial<PriceListLine>) {
    setLines((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  }

  function updateTier(itemId: string, tierId: string, patch: Partial<PriceTier>) {
    setLines((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        tiers: prev[itemId].tiers.map((t) => (t.id === tierId ? { ...t, ...patch } : t)),
      },
    }));
  }

  function addTier(itemId: string) {
    const line = lines[itemId];
    const sorted = [...line.tiers].sort((a, b) => a.from_qty - b.from_qty);
    const last = sorted[sorted.length - 1];
    const nextFrom = last ? (last.to_qty ?? last.from_qty) + 1 : 1;
    const newTier: PriceTier = {
      id: crypto.randomUUID(),
      from_qty: nextFrom,
      to_qty: null,
      mode: "price",
      value: line.base_price,
    };
    updateLine(itemId, { tiers: [...line.tiers, newTier] });
  }

  function removeTier(itemId: string, tierId: string) {
    const line = lines[itemId];
    updateLine(itemId, { tiers: line.tiers.filter((t) => t.id !== tierId) });
  }

  function handleCopy(targetItemIds: string[]) {
    if (!copyDialogItemId) return;
    const source = lines[copyDialogItemId];
    setLines((prev) => {
      const next = { ...prev };
      for (const targetId of targetItemIds) {
        next[targetId] = {
          ...next[targetId],
          tier_uom: source.tier_uom,
          tiers: source.tiers.map((t) => ({ ...t, id: crypto.randomUUID() })),
        };
      }
      return next;
    });
    setCopyDialogItemId(null);
    toast.success(t("editor.copy_success"));
  }

  function handleSave() {
    setSaving(true);
    clearPriceCache();
    window.setTimeout(() => {
      setSaving(false);
      toast.success(t("editor.saved"));
    }, 400);
  }

  if (!priceList) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("price_tiers.title")} />
        <EmptyState icon={Layers} title={t("price_tiers.title")} description={t("editor.no_items")} />
      </div>
    );
  }

  const plName = lang === "ar" ? priceList.name_ar : priceList.name_en;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={plName}
        subtitle={t("editor.subtitle")}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 me-1.5" />
            {t("editor.save")}
          </Button>
        }
      />

      <PageSection padded={false}>
        {itemsInList.length === 0 ? (
          <EmptyState icon={Layers} title={t("editor.no_items")} description="" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-8" />
                <TableHead className="text-xs">{t("editor.item_col")}</TableHead>
                <TableHead className="text-xs w-32">{t("editor.base_price_col")}</TableHead>
                <TableHead className="text-xs w-32">{t("editor.ref_unit_col")}</TableHead>
                <TableHead className="text-xs w-24">{t("editor.expand")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsInList.map((item) => {
                const line = lines[item.id];
                const errors = validateTiers(line.tiers);
                const hasError = errors.some((e) => e.severity === "error");
                const isOpen = expanded.has(item.id);
                const name = lang === "ar" ? item.name_ar : item.name_en;

                return (
                  <Fragment key={item.id}>
                    <TableRow
                      className="border-b border-border cursor-pointer hover:bg-muted/30"
                      onClick={() => toggleExpand(item.id)}
                    >
                      <TableCell className="px-3">
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{name}</TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground">
                        {formatMoney(line.base_price, lang)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{uomLabel(line.tier_uom)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{line.tiers.length}</Badge>
                      </TableCell>
                      <TableCell>
                        {hasError && <AlertTriangle className="h-4 w-4 text-danger" />}
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow className="border-b border-border">
                        <TableCell colSpan={6} className="bg-muted/10 p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">{t("editor.base_price_col")}</span>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={line.base_price}
                                  onChange={(e) => updateLine(item.id, { base_price: parseFloat(e.target.value) || 0 })}
                                  className="w-28 h-8 text-sm tabular-nums"
                                />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCopyDialogItemId(item.id)}
                              >
                                <Copy className="h-3.5 w-3.5 me-1.5" />
                                {t("editor.copy_to")}
                              </Button>
                            </div>

                            <div className="rounded border border-border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="text-xs">{t("editor.col_from")}</TableHead>
                                    <TableHead className="text-xs">
                                      {t("editor.col_to")} <span className="text-muted-foreground/70">{t("editor.col_to_hint")}</span>
                                    </TableHead>
                                    <TableHead className="text-xs">{t("editor.col_mode")}</TableHead>
                                    <TableHead className="text-xs">{t("editor.col_value")}</TableHead>
                                    <TableHead className="text-xs">{t("editor.col_ref_unit")}</TableHead>
                                    <TableHead className="w-10" />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {[...line.tiers].sort((a, b) => a.from_qty - b.from_qty).map((tier) => (
                                    <TableRow key={tier.id}>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min={1}
                                          value={tier.from_qty}
                                          onChange={(e) => updateTier(item.id, tier.id, { from_qty: parseInt(e.target.value, 10) || 0 })}
                                          className="w-20 h-8 text-sm tabular-nums"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min={1}
                                          value={tier.to_qty ?? ""}
                                          placeholder={t("editor.infinity")}
                                          onChange={(e) => updateTier(item.id, tier.id, { to_qty: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                                          className="w-20 h-8 text-sm tabular-nums"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Select
                                          value={tier.mode}
                                          onValueChange={(v) => updateTier(item.id, tier.id, { mode: v as PriceTier["mode"] })}
                                        >
                                          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="price">{t("editor.mode_price")}</SelectItem>
                                            <SelectItem value="discount_pct">{t("editor.mode_discount")}</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min={0}
                                          step={0.01}
                                          value={tier.value}
                                          onChange={(e) => updateTier(item.id, tier.id, { value: parseFloat(e.target.value) || 0 })}
                                          className="w-24 h-8 text-sm tabular-nums"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Select
                                          value={line.tier_uom}
                                          onValueChange={(v) => updateLine(item.id, { tier_uom: v })}
                                        >
                                          <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {uoms.map((u) => (
                                              <SelectItem key={u.id} value={u.id}>{lang === "ar" ? u.name_ar : u.name_en}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-muted-foreground hover:text-danger"
                                          aria-label={t("editor.remove_tier")}
                                          onClick={() => removeTier(item.id, tier.id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>

                            <Button variant="outline" size="sm" onClick={() => addTier(item.id)}>
                              <Plus className="h-3.5 w-3.5 me-1.5" />
                              {t("editor.add_tier")}
                            </Button>

                            {errors.length > 0 && (
                              <div className="space-y-1.5">
                                {errors.map((err, i) => (
                                  <TierValidationMessage key={i} error={err} t={t} />
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </PageSection>

      <CopyTiersDialog
        open={copyDialogItemId !== null}
        onOpenChange={(o) => !o && setCopyDialogItemId(null)}
        sourceItem={allItems.find((it) => it.id === copyDialogItemId)}
        targetItems={itemsInList.filter((it) => it.id !== copyDialogItemId)}
        lang={lang}
        onCopy={handleCopy}
      />
    </div>
  );
}

function TierValidationMessage({
  error, t,
}: {
  error: TierValidationError;
  t: ReturnType<typeof useTranslation<"wholesale">>["t"];
}) {
  const tone = error.severity === "error" ? "text-danger-text bg-danger-tint" : "text-warning-text bg-warning-tint";
  const Icon = error.severity === "error" ? AlertTriangle : Info;
  const message = error.type === "no_start_at_one"
    ? t("editor.no_start_at_one")
    : t(`editor.${error.type}`, { from: fmtQty(error.from), to: fmtQty(error.to) });

  return (
    <div className={cn("flex items-center gap-2 rounded px-2.5 py-1.5 text-xs", tone)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {message}
    </div>
  );
}
