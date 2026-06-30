import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { StatusPill }  from "@/components/patterns/StatusPill";
import { Skeleton }    from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Badge }  from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ModalShell }    from "@/components/patterns/ModalShell";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, Tag, MoreVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { formatNumber } from "@/lib/format";
import { cn }           from "@/lib/utils";
import { useCan }       from "@/lib/permissions";
import { useItems }     from "../items/useItems";

/* ─── Skeleton ───────────────────────────────────────────────── */

function PlSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[140, 72, 80, 88, 72].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.2 }}
        >
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
          <Skeleton className="h-3.5 w-20 hidden md:block" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/* ─── Form state ─────────────────────────────────────────────── */

interface PlForm { name_ar: string; name_en: string; }
const EMPTY_FORM: PlForm = { name_ar: "", name_en: "" };

/* ─── Main page ─────────────────────────────────────────────── */

export function PriceListsPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const navigate     = useNavigate();
  const can          = useCan();

  const { data, loading, error, reload } = useItems();

  const priceLists = data?.price_lists ?? [];
  const totalCount = priceLists.length;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]             = useState<PlForm>(EMPTY_FORM);
  const [formErr, setFormErr]       = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTable    = !showSkeleton && !showError && !isEmpty;

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErr("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name_ar.trim()) { setFormErr(t("price_lists.form_name_req")); return; }
    setFormSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setFormSaving(false);
    setDialogOpen(false);
    toast.success(lang === "ar" ? "تمت الإضافة" : "Price list created");
  }

  async function handleDelete(_id: string) {
    await new Promise(r => setTimeout(r, 400));
    setDeleteTarget(null);
    toast.success(lang === "ar" ? "تم الحذف" : "Deleted");
  }

  const pageActions = can("inventory.pricelist.manage") ? (
    <Button size="sm" onClick={openCreate}>
      <Plus className="h-4 w-4 me-1.5" />
      {t("price_lists.new")}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("price_lists.title")}
        subtitle={totalCount > 0 ? t("price_lists.count", { n: totalCount }) : undefined}
        actions={pageActions}
      />

      <PageSection padded={false}>
        {showSkeleton && <PlSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={Tag}
              title={t("price_lists.empty_title")}
              description={t("price_lists.empty_sub")}
              action={
                can("inventory.pricelist.manage")
                  ? { label: t("price_lists.new"), onClick: openCreate }
                  : undefined
              }
            />
          </div>
        )}

        {showTable && (
          <>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border">
                  {[
                    { key: "name",         label: t("columns.name"),         cls: "font-semibold" },
                    { key: "currency",     label: t("columns.currency"),     cls: "font-semibold hidden sm:table-cell" },
                    { key: "priced_items", label: t("columns.priced_items"), cls: "font-semibold hidden md:table-cell text-start" },
                    { key: "status",       label: t("columns.status"),       cls: "font-semibold" },
                    { key: "actions",      label: "",                        cls: "w-10" },
                  ].map(col => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-10 py-2 px-3 text-xs text-muted-foreground whitespace-nowrap",
                        col.cls
                      )}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {priceLists.map(pl => (
                  <TableRow
                    key={pl.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/inventory/price-lists/${pl.id}`)}
                  >
                    {/* Name + default badge */}
                    <TableCell className="px-3 py-3">
                      <span className="flex items-center gap-2 font-medium">
                        {lang === "ar" ? pl.name_ar : pl.name_en}
                        {pl.is_default && (
                          <Badge variant="secondary" className="text-xs h-5 px-1.5">
                            {t("price_lists.default_badge")}
                          </Badge>
                        )}
                      </span>
                    </TableCell>

                    {/* Currency */}
                    <TableCell className="px-3 py-3 hidden sm:table-cell">
                      <span className="font-mono text-sm">{pl.currency}</span>
                    </TableCell>

                    {/* Priced items */}
                    <TableCell className="px-3 py-3 text-start tabular-nums text-sm hidden md:table-cell">
                      {formatNumber(pl.priced_items)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-3 py-3">
                      <StatusPill
                        variant={pl.status === "active" ? "active" : "inactive"}
                        label={t(`status.${pl.status}`)}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell
                      className="px-3 py-3 w-10"
                      onClick={e => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/inventory/price-lists/${pl.id}`)}
                          >
                            {t("price_lists.view_prices")}
                          </DropdownMenuItem>
                          {can("inventory.pricelist.manage") && (
                            <DropdownMenuItem>{t("actions.edit")}</DropdownMenuItem>
                          )}
                          {can("inventory.pricelist.manage") && !pl.is_default && (
                            <DropdownMenuItem>{t("actions.set_default")}</DropdownMenuItem>
                          )}
                          {can("inventory.pricelist.manage") && !pl.is_default && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(pl.id)}
                              >
                                {t("actions.delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-end px-4 py-2 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("price_lists.showing", { from: 1, to: totalCount, total: totalCount })}
              </span>
            </div>
          </>
        )}
      </PageSection>

      {/* ── Create price list dialog ──────────────────────────── */}
      <ModalShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={t("price_lists.new_form_title")}
        description={t("price_lists.new")}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={formSaving}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={formSaving}>
              {formSaving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("actions.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("price_lists.form_name")} (AR) *</Label>
            <Input
              value={form.name_ar}
              onChange={e => { setForm(f => ({ ...f, name_ar: e.target.value })); setFormErr(""); }}
              placeholder={lang === "ar" ? "اسم القائمة بالعربي" : "Arabic name"}
              className={cn(formErr && "border-destructive")}
              dir="rtl"
            />
            {formErr && <p className="text-xs text-destructive">{formErr}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t("price_lists.form_name")} (EN)</Label>
            <Input
              value={form.name_en}
              onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
              placeholder="English name"
              dir="ltr"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("price_lists.form_currency")}:</span>
            <span className="font-mono font-medium text-foreground">EGP</span>
          </div>
        </div>
      </ModalShell>

      {/* ── Delete confirm ────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={v => !v && setDeleteTarget(null)}
        title={t("price_lists.delete_title")}
        description={t("price_lists.delete_desc")}
        confirmTone="danger"
        confirmLabel={t("actions.confirm_delete")}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
