import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { StatusPill }    from "@/components/patterns/StatusPill";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Badge }     from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, Search, Layers, MoreVertical, X } from "lucide-react";

import { cn }       from "@/lib/utils";
import { useCan }   from "@/lib/permissions";
import { useItems } from "../items/useItems";
import type { InventoryCategory } from "../items/types";

/* ─── Skeleton ───────────────────────────────────────────────── */

function CatSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[120, 96, 56].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24 hidden sm:block" />
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export function CategoriesPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();

  const { data, loading, error, reload } = useItems();
  const [search, setSearch] = useState("");

  const { parents, childrenOf } = useMemo(() => {
    if (!data) return { parents: [], childrenOf: {} as Record<string, InventoryCategory[]> };

    const lq = search.toLowerCase();
    const all = search
      ? data.categories.filter(
          (c) => c.name_ar.includes(search) || c.name_en.toLowerCase().includes(lq)
        )
      : data.categories;

    const parentList = all.filter((c) => c.parent_id === null);
    const childMap: Record<string, InventoryCategory[]> = {};
    all.filter((c) => c.parent_id !== null).forEach((c) => {
      if (!childMap[c.parent_id!]) childMap[c.parent_id!] = [];
      childMap[c.parent_id!].push(c);
    });
    return { parents: parentList, childrenOf: childMap };
  }, [data, search]);

  const totalCount = data?.categories.length ?? 0;

  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTable    = !showSkeleton && !showError && !isEmpty;

  const pageActions = can("inventory.category.create") ? (
    <Button size="sm">
      <Plus className="h-4 w-4 me-1.5" />
      {t("categories.new")}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <PageHeader
        title={t("categories.title")}
        subtitle={totalCount > 0 ? t("categories.count", { n: totalCount }) : undefined}
        actions={pageActions}
      />

      <PageSection padded={false}>
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="ps-9 h-9 text-sm"
              placeholder={t("categories.search_ph")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {showSkeleton && <CatSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={Layers}
              title={t("categories.empty_title")}
              description={t("categories.empty_sub")}
              action={
                can("inventory.category.create")
                  ? { label: t("categories.new"), onClick: () => {} }
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
                  <TableHead className="h-10 py-2 px-4 text-xs font-semibold text-muted-foreground">
                    {t("columns.name")}
                  </TableHead>
                  <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                    {t("columns.parent")}
                  </TableHead>
                  <TableHead className="h-10 py-2 px-3 text-xs font-semibold text-muted-foreground text-end">
                    {t("columns.items_count")}
                  </TableHead>
                  <TableHead className="h-10 w-10 py-2 px-3" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {parents.map((parent) => {
                  const children = childrenOf[parent.id] ?? [];
                  return [
                    /* parent row */
                    <TableRow
                      key={parent.id}
                      className="border-b border-border hover:bg-muted/30 cursor-default"
                    >
                      <TableCell className="px-4 py-3 font-medium">
                        <span className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                          {lang === "ar" ? parent.name_ar : parent.name_en}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {t("categories.root")}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-end tabular-nums text-sm">
                        <Badge variant="secondary" className="ms-auto">
                          {parent.item_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-3 w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {can("inventory.category.edit") && (
                              <DropdownMenuItem>{t("actions.edit")}</DropdownMenuItem>
                            )}
                            {can("inventory.category.create") && (
                              <DropdownMenuItem>{t("categories.new")}</DropdownMenuItem>
                            )}
                            {can("inventory.category.delete") && (
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
                    </TableRow>,

                    /* child rows */
                    ...children.map((child) => (
                      <TableRow
                        key={child.id}
                        className="border-b border-border hover:bg-muted/30 cursor-default bg-muted/10"
                      >
                        <TableCell className="px-4 py-2.5 text-sm ps-10">
                          {lang === "ar" ? child.name_ar : child.name_en}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">
                          {lang === "ar" ? parent.name_ar : parent.name_en}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-end tabular-nums text-sm">
                          <Badge variant="secondary" className="ms-auto">
                            {child.item_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 w-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {can("inventory.category.edit") && (
                                <DropdownMenuItem>{t("actions.edit")}</DropdownMenuItem>
                              )}
                              {can("inventory.category.delete") && (
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
                    )),
                  ];
                })}
              </TableBody>
            </Table>

            {/* Footer */}
            <div className="flex items-center justify-end px-4 py-2 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("categories.showing", {
                  from: totalCount > 0 ? 1 : 0,
                  to: totalCount,
                  total: totalCount,
                })}
              </span>
            </div>
          </>
        )}
      </PageSection>
    </div>
  );
}
