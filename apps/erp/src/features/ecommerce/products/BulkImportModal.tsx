import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, PackageSearch, AlertTriangle } from "lucide-react";

import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { getBulkPublishCandidates, inventoryCategoryLabel, INVENTORY_CATEGORY_LABELS } from "@/lib/mock/ecommerce";
import { getStoreCategories } from "@/lib/mock/ecommerce";
import { useEcommerceProducts } from "@/stores/ecommerceProducts";
import { useEcommerceCatalogModes } from "@/stores/ecommerceCatalogModes";
import { categoryLabel } from "../catalog";
import type { EcBulkCandidate } from "../types";

/**
 * §3.7 Mode 2 — "استيراد من المخزون" modal, launched from the products
 * list when `catalog_mode === "bulk"`. Permission: `ecommerce.products.manage`
 * (spec §3.7 "Permissions") — the caller (ProductsListPage) already gates
 * the launch button; this component assumes it can act.
 */
export function BulkImportModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();

  const productsMap = useEcommerceProducts((s) => s.products);
  const bulkPublish = useEcommerceCatalogModes((s) => s.bulkPublish);
  const storeCategories = getStoreCategories();

  const linkedIds = useMemo(() => Object.values(productsMap).map((p) => p.inventory_item_id), [productsMap]);
  const candidates = useMemo(() => getBulkPublishCandidates(linkedIds), [linkedIds]);

  const [search, setSearch] = useState("");
  const [invCategory, setInvCategory] = useState("");
  const [targetCategory, setTargetCategory] = useState(storeCategories[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [report, setReport] = useState<{ publishedIds: string[]; failed: { inventory_item_id: string; name_ar: string; reason: string }[] } | null>(null);

  const filtered = useMemo(() => {
    let list = candidates;
    if (search) {
      const q = search.trim();
      list = list.filter((c) => c.name_ar.includes(q) || (c.name_en ?? "").toLowerCase().includes(q.toLowerCase()));
    }
    if (invCategory) list = list.filter((c) => c.inventory_category_id === invCategory);
    return list;
  }, [candidates, search, invCategory]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.inventory_item_id));

  function toggleOne(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((s) => {
      if (allSelected) {
        const next = new Set(s);
        for (const c of filtered) next.delete(c.inventory_item_id);
        return next;
      }
      const next = new Set(s);
      for (const c of filtered) next.add(c.inventory_item_id);
      return next;
    });
  }

  function handleClose(next: boolean) {
    if (!next) {
      setSearch(""); setInvCategory(""); setSelected(new Set()); setReport(null); setPublishing(false);
    }
    onOpenChange(next);
  }

  async function handlePublish() {
    const picked = candidates.filter((c) => selected.has(c.inventory_item_id));
    if (picked.length === 0 || !targetCategory) return;
    setPublishing(true);
    // §3.7 "progress indicator for large batches" — the mock has nothing
    // slow to await, so this is a deliberate visible delay, not a real one.
    await new Promise((r) => setTimeout(r, 500 + picked.length * 120));
    const result = bulkPublish(picked, targetCategory);
    setReport(result);
    setSelected(new Set());
    setPublishing(false);
    if (result.failed.length === 0) {
      toast.success(t("products.bulk.publish_success_toast", { n: result.publishedIds.length }));
    } else {
      toast.warning(t("products.bulk.publish_partial_toast", { ok: result.publishedIds.length, failed: result.failed.length }));
    }
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={handleClose}
      title={t("products.bulk.title")}
      description={t("products.bulk.description")}
      size="lg"
      footer={
        report ? (
          <Button onClick={() => handleClose(false)}>{t("products.bulk.done")}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => handleClose(false)}>{t("products.bulk.cancel")}</Button>
            <Button onClick={handlePublish} disabled={selected.size === 0 || !targetCategory || publishing}>
              {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("products.bulk.publish_selected", { n: selected.size })}
            </Button>
          </>
        )
      }
    >
      {report ? (
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {t("products.bulk.report_summary", { ok: report.publishedIds.length, failed: report.failed.length })}
          </p>
          {report.failed.length > 0 && (
            <div className="rounded-md border border-danger/30 bg-danger/5 p-3 space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-danger-text">
                <AlertTriangle className="h-3.5 w-3.5" /> {t("products.bulk.failed_title")}
              </p>
              <ul className="space-y-1">
                {report.failed.map((f) => (
                  <li key={f.inventory_item_id} className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{f.name_ar}</span>
                    <span className="text-danger-text">{t(`products.bulk.fail_reason_${f.reason}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <PackageSearch className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("products.bulk.all_published")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("products.bulk.search_placeholder")} className="h-9 flex-1 min-w-40" />
            <Select value={invCategory || "__all__"} onValueChange={(v) => setInvCategory(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-9 w-auto min-w-40"><SelectValue placeholder={t("products.bulk.all_inv_categories")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("products.bulk.all_inv_categories")}</SelectItem>
                {Object.keys(INVENTORY_CATEGORY_LABELS).map((id) => (
                  <SelectItem key={id} value={id}>{inventoryCategoryLabel(id, lang)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} disabled={filtered.length === 0} />
              {t("products.bulk.select_all")}
            </label>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {t("products.bulk.target_category")}
              <Select value={targetCategory} onValueChange={setTargetCategory}>
                <SelectTrigger className="h-8 w-auto min-w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {storeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{categoryLabel(c.id, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("products.bulk.no_results")}</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {filtered.map((c) => (
                <CandidateRow key={c.inventory_item_id} candidate={c} checked={selected.has(c.inventory_item_id)} onToggle={() => toggleOne(c.inventory_item_id)} lang={lang} />
              ))}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}

function CandidateRow({
  candidate, checked, onToggle, lang,
}: {
  candidate: EcBulkCandidate;
  checked: boolean;
  onToggle: () => void;
  lang: "ar" | "en";
}) {
  const { t } = useTranslation("ecommerce");
  const suspended = candidate.status === "suspended";
  return (
    <label className={`flex items-center gap-3 px-3 py-2.5 text-sm ${suspended ? "opacity-60" : "cursor-pointer hover:bg-muted/40"}`}>
      <Checkbox checked={checked} onCheckedChange={suspended ? undefined : onToggle} disabled={suspended} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{candidate.name_ar}</p>
        <p className="text-xs text-muted-foreground">{inventoryCategoryLabel(candidate.inventory_category_id, lang)}</p>
      </div>
      <span className="tabular-nums text-xs text-muted-foreground">{formatMoney(candidate.erp_price, lang)}</span>
      {suspended && (
        <span className="text-[11px] text-danger-text shrink-0">{t("products.bulk.fail_reason_suspended")}</span>
      )}
    </label>
  );
}
