import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { StatusPill }  from "@/components/patterns/StatusPill";
import { Skeleton }    from "@/components/patterns/Skeletons";
import { RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";

import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, Tag, MoreVertical, Eye, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatNumber } from "@/lib/format";
import { cn }           from "@/lib/utils";
import { useCan }       from "@/lib/permissions";
import { useCreateDispatcher } from "@/stores/createDispatcher";
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

/* ─── Main page ─────────────────────────────────────────────── */

export function PriceListsPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const navigate     = useNavigate();
  const can          = useCan();
  const openCreate   = useCreateDispatcher(s => s.openCreate);

  const { data, loading, error, reload } = useItems();

  const priceLists = data?.price_lists ?? [];
  const totalCount = priceLists.length;

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTable    = !showSkeleton && !showError && !isEmpty;

  async function handleDelete(_id: string) {
    await new Promise(r => setTimeout(r, 400));
    setDeleteTarget(null);
    toast.success(lang === "ar" ? "تم الحذف" : "Deleted");
  }

  const pageActions = can("inventory.pricelist.manage") ? (
    <Button size="sm" onClick={() => openCreate("new_price_list")}>
      <Plus className="h-4 w-4 me-1.5" />
      {t("price_lists.new")}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("price_lists.title")}
        count={totalCount > 0 ? t("price_lists.count", { n: totalCount }) : undefined}
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
                  ? { label: t("price_lists.new"), onClick: () => openCreate("new_price_list") }
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
                        <RowActionsContent>
                          <RowActionItem
                            icon={Eye}
                            onClick={() => navigate(`/inventory/price-lists/${pl.id}`)}
                          >
                            {t("price_lists.view_prices")}
                          </RowActionItem>
                          {can("inventory.pricelist.manage") && (
                            <RowActionItem icon={Pencil}>{t("actions.edit")}</RowActionItem>
                          )}
                          {can("inventory.pricelist.manage") && !pl.is_default && (
                            <RowActionItem icon={Star}>{t("actions.set_default")}</RowActionItem>
                          )}
                          {can("inventory.pricelist.manage") && !pl.is_default && (
                            <>
                              <DropdownMenuSeparator />
                              <RowActionItem
                                icon={Trash2}
                                destructive
                                onClick={() => setDeleteTarget(pl.id)}
                              >
                                {t("actions.delete")}
                              </RowActionItem>
                            </>
                          )}
                        </RowActionsContent>
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
