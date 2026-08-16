import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, X, AlertTriangle, Link2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { ErrorState } from "@/components/patterns/ErrorState";
import { Skeleton } from "@/components/patterns/Skeletons";
import { FormSection, FormField, FormGrid, FormActions } from "@/components/patterns/FormLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useEcommerceProducts } from "@/stores/ecommerceProducts";
import { getStoreCategories, getLinkableInventoryItem } from "@/lib/mock/ecommerce";
import { categoryLabel } from "../catalog";
import { InventoryItemPicker } from "./InventoryItemPicker";
import type { EcOnlineProduct, EcOnlineProductVariant, LinkableInventoryItem } from "../types";

const ArrowBack = ({ className }: { className?: string }) =>
  document.dir === "rtl" ? <ArrowRight className={className} /> : <ArrowLeft className={className} />;

function EditorSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

interface FormState {
  inventory_item_id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  images: string[];
  meta_title_ar: string;
  slug_ar: string;
  slug_en: string;
  og_image: string;
  store_category: string;
  online_price: string; // "" = no override
  publish_status: EcOnlineProduct["publish_status"];
  variants: EcOnlineProductVariant[];
}

function emptyForm(): FormState {
  return {
    inventory_item_id: "", title_ar: "", title_en: "", description_ar: "", images: [],
    meta_title_ar: "", slug_ar: "", slug_en: "", og_image: "",
    store_category: "", online_price: "", publish_status: "draft", variants: [],
  };
}

function formFromProduct(p: EcOnlineProduct): FormState {
  return {
    inventory_item_id: p.inventory_item_id,
    title_ar: p.title_ar,
    title_en: p.title_en ?? "",
    description_ar: p.description_ar ?? "",
    images: p.images ?? [],
    meta_title_ar: p.seo.meta_title_ar ?? "",
    slug_ar: p.seo.slug_ar ?? "",
    slug_en: p.seo.slug_en ?? "",
    og_image: p.seo.og_image ?? "",
    store_category: p.store_category,
    online_price: p.online_price != null ? String(p.online_price) : "",
    publish_status: p.publish_status,
    variants: p.variants ?? [],
  };
}

/** spec §3.2 — publish/edit form, both create and edit (route `:id`, the
 * literal `"new"` segment means create — same idiom Inventory's stocktake/
 * price-list editors use, not a separate `/new` route). */
export function ProductEditorPage() {
  const { id = "new" } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();

  const product = useEcommerceProducts((s) => (isNew ? undefined : s.products[id]));
  const createProduct = useEcommerceProducts((s) => s.createProduct);
  const updateProduct = useEcommerceProducts((s) => s.updateProduct);
  const allProducts = useEcommerceProducts((s) => s.products);
  const categories = getStoreCategories();

  // Already-linked item ids (other products) — a picked item can't back
  // two online products at once.
  const excludeIds = useMemo(
    () => Object.values(allProducts).filter((p) => p.id !== id).map((p) => p.inventory_item_id),
    [allProducts, id]
  );

  const [loading, setLoading] = useState(!isNew);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [erpMeta, setErpMeta] = useState<{ base_price: number; stock: number | null; status?: "active" | "suspended" }>({
    base_price: 0, stock: null,
  });
  const [imageDraft, setImageDraft] = useState("");
  const [variantDraft, setVariantDraft] = useState<{ size: string; color: string }>({ size: "", color: "" });

  useEffect(() => {
    if (isNew) { setLoading(false); return; }
    if (product) {
      setForm(formFromProduct(product));
      setErpMeta({ base_price: product.erp_base_price, stock: product.erp_stock, status: product.erp_status });
    }
    setLoading(false);
  }, [isNew, product]);

  const canManage = can("ecommerce.products.manage");
  const suspended = erpMeta.status === "suspended";

  function pickInventoryItem(item: LinkableInventoryItem) {
    setForm((f) => ({ ...f, inventory_item_id: item.id }));
    setErpMeta({ base_price: item.base_price, stock: item.stock, status: item.status });
  }

  function addImage() {
    if (!imageDraft.trim()) return;
    setForm((f) => ({ ...f, images: [...f.images, imageDraft.trim()] }));
    setImageDraft("");
  }
  function removeImage(i: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  }

  function addVariant() {
    if (!variantDraft.size.trim() && !variantDraft.color.trim()) return;
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { size: variantDraft.size.trim() || undefined, color: variantDraft.color.trim() || undefined }],
    }));
    setVariantDraft({ size: "", color: "" });
  }
  function removeVariant(i: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  }

  const valid = form.inventory_item_id && form.title_ar.trim() && form.store_category;

  function handleSave() {
    if (!valid) return;
    const payload: Omit<EcOnlineProduct, "id"> = {
      inventory_item_id: form.inventory_item_id,
      title_ar: form.title_ar.trim(),
      title_en: form.title_en.trim() || undefined,
      description_ar: form.description_ar.trim() || undefined,
      images: form.images,
      seo: {
        meta_title_ar: form.meta_title_ar.trim() || undefined,
        slug_ar: form.slug_ar.trim() || undefined,
        slug_en: form.slug_en.trim() || undefined,
        og_image: form.og_image.trim() || undefined,
      },
      store_category: form.store_category,
      online_price: form.online_price.trim() ? Number(form.online_price) : null,
      erp_base_price: erpMeta.base_price,
      erp_stock: erpMeta.stock,
      erp_status: erpMeta.status,
      publish_status: form.publish_status,
      variants: form.variants.length > 0 ? form.variants : undefined,
    };

    if (isNew) {
      createProduct(payload);
      toast.success(t("products.created_toast"));
    } else {
      updateProduct(id, payload);
      toast.success(t("products.saved_toast"));
    }
    // spec §3.2 "on save → revalidateTag propagates to all storefront
    // instances" — mocked (no real Next.js instance from this admin), but
    // surfaced honestly rather than silently doing nothing.
    toast.message(t("products.revalidated_toast"));
    navigate("/ecommerce/products");
  }

  if (loading) return <div className="p-4"><EditorSkeleton /></div>;

  if (!isNew && !product) {
    return (
      <div className="space-y-4 p-4">
        <PageHeader title={t("products.not_found_title")} />
        <PageSection>
          <ErrorState description={t("products.not_found_body")} />
          <Button variant="ghost" onClick={() => navigate("/ecommerce/products")} className="mt-3">
            <ArrowBack className="h-4 w-4" /> {t("products.back_to_list")}
          </Button>
        </PageSection>
      </div>
    );
  }

  const linkedItem = form.inventory_item_id ? getLinkableInventoryItem(form.inventory_item_id) : undefined;

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title={isNew ? t("products.new_title") : form.title_ar}
        crumbLabel={isNew ? t("products.new") : form.title_ar}
      />

      {suspended && (
        <div className="mx-4 flex items-center gap-2 rounded-md border border-danger/40 bg-danger-tint px-3 py-2 text-sm text-danger-text">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("products.erp_suspended_warning")}
        </div>
      )}

      <PageSection className="mx-4 space-y-6">
        <FormSection title={t("products.section_link")} subtitle={t("products.section_link_sub")}>
          <div className="flex items-center gap-3 flex-wrap">
            <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
              <Link2 className="h-4 w-4" /> {linkedItem ? t("products.change_link") : t("products.pick_item")}
            </Button>
            {linkedItem && (
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium">{lang === "ar" ? linkedItem.name_ar : linkedItem.name_en}</span>
                <Badge variant="outline" className="tabular-nums font-normal">{t("products.erp_base_price")}: {erpMeta.base_price}</Badge>
                <Badge variant="outline" className="tabular-nums font-normal">{t("products.erp_stock")}: {erpMeta.stock ?? "—"}</Badge>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title={t("products.section_display")}>
          <FormGrid cols={2}>
            <FormField label={t("products.field_title_ar")} required>
              <Input value={form.title_ar} onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))} />
            </FormField>
            <FormField label={t("products.field_title_en")}>
              <Input dir="ltr" value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
            </FormField>
          </FormGrid>
          <FormField label={t("products.field_description")}>
            <Textarea rows={3} value={form.description_ar} onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))} />
          </FormField>
          <FormGrid cols={2}>
            <FormField label={t("products.field_category")} required>
              <Select value={form.store_category} onValueChange={(v) => setForm((f) => ({ ...f, store_category: v }))}>
                <SelectTrigger><SelectValue placeholder={t("products.field_category_placeholder")} /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{categoryLabel(c.id, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("products.field_online_price")} helper={t("products.field_online_price_helper")}>
              <Input type="number" min={0} className="tabular-nums" value={form.online_price} onChange={(e) => setForm((f) => ({ ...f, online_price: e.target.value }))} />
            </FormField>
          </FormGrid>
          <FormField label={t("products.field_publish_status")}>
            <Select value={form.publish_status} onValueChange={(v) => setForm((f) => ({ ...f, publish_status: v as EcOnlineProduct["publish_status"] }))}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["published", "draft", "hidden"] as const).map((s) => (
                  <SelectItem key={s} value={s}>{t(`products.status_${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        <FormSection title={t("products.section_images")} subtitle={t("products.section_images_sub")}>
          <div className="flex items-center gap-2">
            <Input value={imageDraft} onChange={(e) => setImageDraft(e.target.value)} placeholder={t("products.image_placeholder")} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())} />
            <Button type="button" variant="outline" onClick={addImage}><Plus className="h-4 w-4" /></Button>
          </div>
          {form.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <Badge key={i} variant="outline" className="gap-1.5 font-normal">
                  {img}
                  <button type="button" onClick={() => removeImage(i)} aria-label={t("products.remove_image")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection title={t("products.section_variants")} subtitle={t("products.section_variants_sub")}>
          <div className="flex items-center gap-2 flex-wrap">
            <Input className="w-28" value={variantDraft.size} onChange={(e) => setVariantDraft((v) => ({ ...v, size: e.target.value }))} placeholder={t("products.variant_size")} />
            <Input className="w-32" value={variantDraft.color} onChange={(e) => setVariantDraft((v) => ({ ...v, color: e.target.value }))} placeholder={t("products.variant_color")} />
            <Button type="button" variant="outline" onClick={addVariant}><Plus className="h-4 w-4" /> {t("products.add_variant")}</Button>
          </div>
          {form.variants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.variants.map((v, i) => (
                <Badge key={i} variant="outline" className="gap-1.5 font-normal">
                  {[v.size, v.color].filter(Boolean).join("/")}
                  <button type="button" onClick={() => removeVariant(i)} aria-label={t("products.remove_variant")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection title={t("products.section_seo")} subtitle={t("products.section_seo_sub")}>
          <FormGrid cols={2}>
            <FormField label={t("products.field_meta_title")}>
              <Input value={form.meta_title_ar} onChange={(e) => setForm((f) => ({ ...f, meta_title_ar: e.target.value }))} />
            </FormField>
            <FormField label={t("products.field_og_image")}>
              <Input value={form.og_image} onChange={(e) => setForm((f) => ({ ...f, og_image: e.target.value }))} />
            </FormField>
            <FormField label={t("products.field_slug_ar")}>
              <Input value={form.slug_ar} onChange={(e) => setForm((f) => ({ ...f, slug_ar: e.target.value }))} />
            </FormField>
            <FormField label={t("products.field_slug_en")}>
              <Input dir="ltr" value={form.slug_en} onChange={(e) => setForm((f) => ({ ...f, slug_en: e.target.value }))} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormActions
          onCancel={() => navigate("/ecommerce/products")}
          onSave={canManage ? handleSave : undefined}
          disabled={!valid || !canManage}
          saveLabel={t("products.save")}
        />
      </PageSection>

      <InventoryItemPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        lang={lang}
        excludeIds={excludeIds}
        onPick={pickInventoryItem}
      />
    </div>
  );
}
