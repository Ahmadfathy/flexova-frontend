import { useTranslation } from "react-i18next";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { StatusPill }  from "@/components/patterns/StatusPill";
import { Skeleton }    from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, Tag, MoreVertical, Star } from "lucide-react";

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

/* ─── Main page ─────────────────────────────────────────────── */

export function PriceListsPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();

  const { data, loading, error, reload } = useItems();

  const priceLists = data?.price_lists ?? [];
  const totalCount = priceLists.length;

  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTable    = !showSkeleton && !showError && !isEmpty;

  const pageActions = can("inventory.price_list.create") ? (
    <Button size="sm">
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
                can("inventory.price_list.create")
                  ? { label: t("price_lists.new"), onClick: () => {} }
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
                    { key: "name",         label: t("columns.name"),         cls: "" },
                    { key: "currency",     label: t("columns.currency"),     cls: "hidden sm:table-cell" },
                    { key: "priced_items", label: t("columns.priced_items"), cls: "hidden md:table-cell text-end" },
                    { key: "status",       label: t("columns.status"),       cls: "" },
                    { key: "actions",      label: "",                        cls: "w-10" },
                  ].map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-10 py-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap",
                        col.cls
                      )}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {priceLists.map((pl) => (
                  <TableRow
                    key={pl.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    {/* Name + default */}
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
                    <TableCell className="px-3 py-3 text-end tabular-nums text-sm hidden md:table-cell">
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
                    <TableCell className="px-3 py-3 w-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can("inventory.price_list.edit") && (
                            <DropdownMenuItem>{t("actions.edit")}</DropdownMenuItem>
                          )}
                          {can("inventory.price_list.create") && (
                            <DropdownMenuItem>{t("actions.duplicate")}</DropdownMenuItem>
                          )}
                          {!pl.is_default && can("inventory.price_list.edit") && (
                            <DropdownMenuItem>{t("actions.set_default")}</DropdownMenuItem>
                          )}
                          {can("inventory.price_list.edit") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                {pl.status === "active" ? t("actions.suspend") : t("actions.activate")}
                              </DropdownMenuItem>
                            </>
                          )}
                          {can("inventory.price_list.delete") && !pl.is_default && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive">
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
    </div>
  );
}
