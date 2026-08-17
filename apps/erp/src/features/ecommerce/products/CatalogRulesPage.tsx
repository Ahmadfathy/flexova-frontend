import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, Sparkles, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ModalShell } from "@/components/patterns/ModalShell";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormActions } from "@/components/patterns/FormLayout";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useEcommerceCatalogModes } from "@/stores/ecommerceCatalogModes";
import { getStoreCategories, INVENTORY_CATEGORY_LABELS, inventoryCategoryLabel } from "@/lib/mock/ecommerce";
import { categoryLabel } from "../catalog";
import type { EcCatalogRule } from "../types";

const ArrowBack = ({ className }: { className?: string }) =>
  document.dir === "rtl" ? <ArrowRight className={className} /> : <ArrowLeft className={className} />;

/**
 * §3.7 Mode 3 sub-screen — "rule builder + dry-run preview". Reached from
 * the products list' catalog-mode banner (`catalog_mode === "auto_rule"`)
 * and from StoreConfig's inline "reveal" link — one screen, two entry
 * points, per spec §8 "auto_rule reveals the rule builder".
 * Rule CRUD is `ecommerce.catalog.configure` (governance-sensitive, spec
 * §3.7/§10) — distinct from `ecommerce.products.manage`, which only
 * covers bulk-import/mirror-hide (day-to-day catalog upkeep, not policy).
 */
export function CatalogRulesPage() {
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();
  const canConfigure = can("ecommerce.catalog.configure");

  const rulesMap = useEcommerceCatalogModes((s) => s.rules);
  const dryRunCount = useEcommerceCatalogModes((s) => s.dryRunCount);
  const toggleAutoPublish = useEcommerceCatalogModes((s) => s.toggleRuleAutoPublish);
  const removeRule = useEcommerceCatalogModes((s) => s.removeRule);
  const simulateNewArrival = useEcommerceCatalogModes((s) => s.simulateNewArrival);
  const rules = Object.values(rulesMap);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function handleSimulate(ruleId: string) {
    const result = simulateNewArrival(ruleId);
    toast[result.published ? "success" : "info"](
      result.published
        ? t("products.rules.simulate_published_toast", { name: result.itemName })
        : t("products.rules.simulate_skipped_toast", { name: result.itemName })
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("products.rules.title")}
        actions={canConfigure ? (
          <Button onClick={() => { setEditingId(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> {t("products.rules.new")}
          </Button>
        ) : undefined}
      />

      <div className="px-4 -mt-3 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/ecommerce/products")}>
          <ArrowBack className="h-4 w-4" /> {t("products.rules.back_to_products")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("products.rules.subtitle")}</p>
      </div>

      <PageSection padded={false}>
        {rules.length === 0 ? (
          <EmptyState icon={Sparkles} title={t("products.rules.empty_title")} description={t("products.rules.empty_sub")} />
        ) : (
          <div className="divide-y divide-border">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                lang={lang}
                dryRunCount={dryRunCount(rule.id)}
                canConfigure={canConfigure}
                onToggle={() => toggleAutoPublish(rule.id)}
                onEdit={() => { setEditingId(rule.id); setFormOpen(true); }}
                onDelete={() => setDeleteTarget(rule.id)}
                onSimulate={() => handleSimulate(rule.id)}
              />
            ))}
          </div>
        )}
      </PageSection>

      <RuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editingId ? rulesMap[editingId] : undefined}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("products.rules.delete_title")}
        description={t("products.rules.delete_body")}
        confirmTone="danger"
        onConfirm={() => {
          if (deleteTarget) { removeRule(deleteTarget); toast.success(t("products.rules.deleted_toast")); }
          setDeleteTarget(null);
        }}
      />
    </div>
  );

  function RuleRow({
    rule, lang, dryRunCount, canConfigure, onToggle, onEdit, onDelete, onSimulate,
  }: {
    rule: EcCatalogRule; lang: "ar" | "en"; dryRunCount: number; canConfigure: boolean;
    onToggle: () => void; onEdit: () => void; onDelete: () => void; onSimulate: () => void;
  }) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <div className="flex-1 min-w-48">
          <p className="text-sm font-medium text-foreground">{inventoryCategoryLabel(rule.inventory_category_id, lang)}</p>
          <p className="text-xs text-muted-foreground">
            {t("products.rules.maps_to", { category: categoryLabel(rule.default_store_category, lang) })}
          </p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {t("products.rules.dry_run_result", { n: dryRunCount })}
        </span>
        <Button size="sm" variant="outline" onClick={onSimulate} disabled={!rule.auto_publish}>
          {t("products.rules.simulate")}
        </Button>
        <label className="flex items-center gap-2 text-xs">
          {t("products.rules.auto_publish")}
          <Switch checked={rule.auto_publish} onCheckedChange={onToggle} disabled={!canConfigure} />
        </label>
        {canConfigure && (
          <>
            <Button size="sm" variant="ghost" onClick={onEdit}>{t("products.rules.edit")}</Button>
            <Button size="sm" variant="ghost" className="text-danger-text" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
          </>
        )}
      </div>
    );
  }
}

function RuleFormDialog({
  open, onOpenChange, rule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: EcCatalogRule;
}) {
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const addRule = useEcommerceCatalogModes((s) => s.addRule);
  const updateRule = useEcommerceCatalogModes((s) => s.updateRule);
  const storeCategories = getStoreCategories();

  const [invCategory, setInvCategory] = useState(rule?.inventory_category_id ?? Object.keys(INVENTORY_CATEGORY_LABELS)[0]);
  const [storeCategory, setStoreCategory] = useState(rule?.default_store_category ?? storeCategories[0]?.id ?? "");
  const [autoPublish, setAutoPublish] = useState(rule?.auto_publish ?? true);

  function handleSave() {
    if (!invCategory || !storeCategory) return;
    if (rule) {
      updateRule(rule.id, { inventory_category_id: invCategory, default_store_category: storeCategory, auto_publish: autoPublish });
      toast.success(t("products.rules.saved_toast"));
    } else {
      addRule({ inventory_category_id: invCategory, default_store_category: storeCategory, auto_publish: autoPublish });
      toast.success(t("products.rules.created_toast"));
    }
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={rule ? t("products.rules.edit_title") : t("products.rules.new_title")}
      footer={<FormActions onSave={handleSave} saveLabel={t("products.rules.save")} />}
    >
      <div className="space-y-4">
        <FormField label={t("products.rules.field_inv_category")}>
          <Select value={invCategory} onValueChange={setInvCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(INVENTORY_CATEGORY_LABELS).map((id) => (
                <SelectItem key={id} value={id}>{inventoryCategoryLabel(id, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label={t("products.rules.field_store_category")}>
          <Select value={storeCategory} onValueChange={setStoreCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {storeCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{categoryLabel(c.id, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
          {t("products.rules.field_auto_publish")}
        </label>
      </div>
    </ModalShell>
  );
}
