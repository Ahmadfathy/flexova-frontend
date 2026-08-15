import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Search, ListTree, MoreVertical, Pencil, Copy, Archive, ArchiveRestore } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { DataTable, RowActionsContent, RowActionItem, type Column } from "@/components/patterns/DataTable";
import { Skeleton } from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useMfgBomTemplates } from "@/stores/mfgBomTemplates";
import { getItems } from "@/lib/mock/mfg";
import type { BomTemplate, MfgOverhead } from "@/types/mfg";
import { useBomList } from "./useBomList";

export function BomListPage() {
  const { t } = useTranslation("mfg");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const templates = useMfgBomTemplates((s) => s.templates);
  const cloneTemplate = useMfgBomTemplates((s) => s.cloneTemplate);
  const toggleArchive = useMfgBomTemplates((s) => s.toggleArchive);

  const { loading, error, isOffline, forcedEmpty, reload } = useBomList();
  const items = useMemo(() => getItems(), []);

  const [search, setSearch] = useState("");

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  function itemName(id: string) {
    const item = items.find((i) => i.id === id);
    return item ? (lang === "ar" ? item.name_ar : item.name_en) : id;
  }

  function overheadLabel(overhead: MfgOverhead) {
    if (overhead.method === "fixed") return t("bom.overhead_fixed", { value: overhead.value });
    if (overhead.method === "percent_materials") return t("bom.overhead_percent", { value: overhead.value });
    return t("bom.overhead_rate_hours", { value: overhead.value });
  }

  const canManage = can("mfg.bom.manage");

  if (!can("mfg.bom.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("bom.permission_required")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("bom.title")} />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("bom.title")} />
        <PageSection><ErrorState title={t("bom.error_title")} description={t("bom.error_body")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const allTemplates = forcedEmpty ? [] : Object.values(templates);

  const filtered = search
    ? allTemplates.filter((bt) => {
        const q = search.trim().toLowerCase();
        return bt.name_ar.includes(search) || bt.name_en.toLowerCase().includes(q) || itemName(bt.output_item_id).toLowerCase().includes(q);
      })
    : allTemplates;

  const noResults = forcedNoResults || (allTemplates.length > 0 && filtered.length === 0);

  function handleClone(bt: BomTemplate) {
    const copy = cloneTemplate(bt.id);
    if (copy) toast.success(t("bom.clone_toast", { name: lang === "ar" ? copy.name_ar : copy.name_en }));
  }
  function handleToggleArchive(bt: BomTemplate) {
    toggleArchive(bt.id);
    toast.success(bt.status === "active" ? t("bom.archive_toast") : t("bom.restore_toast"));
  }

  const columns: Column<BomTemplate>[] = [
    {
      key: "product", header: t("bom.col_product"),
      cell: (bt) => (
        <button onClick={() => navigate(`/mfg/bom/${bt.id}`)} className="text-brand hover:underline font-medium">
          {itemName(bt.output_item_id)}
        </button>
      ),
    },
    { key: "components", header: t("bom.col_components"), numeric: true, cell: (bt) => bt.components.length },
    { key: "overhead", header: t("bom.col_overhead"), cell: (bt) => overheadLabel(bt.overhead_default) },
    {
      key: "status", header: t("bom.col_status"),
      cell: (bt) => <StatusPill variant={bt.status === "active" ? "approved" : "inactive"} label={t(`bom.status_${bt.status}`)} />,
    },
    {
      key: "actions", header: t("bom.col_actions"),
      cell: (bt) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <RowActionsContent>
            <RowActionItem icon={Pencil} onClick={() => navigate(`/mfg/bom/${bt.id}`)}>
              {t("bom.action_edit")}
            </RowActionItem>
            {canManage && (
              <RowActionItem icon={Copy} onClick={() => handleClone(bt)}>
                {t("bom.action_clone")}
              </RowActionItem>
            )}
            {canManage && (
              <RowActionItem
                icon={bt.status === "active" ? Archive : ArchiveRestore}
                onClick={() => handleToggleArchive(bt)}
              >
                {bt.status === "active" ? t("bom.action_archive") : t("bom.action_restore")}
              </RowActionItem>
            )}
          </RowActionsContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("bom.title")}
        count={allTemplates.length > 0 ? t("bom.count", { n: allTemplates.length }) : undefined}
        actions={
          canManage && (
            <Button size="sm" onClick={() => navigate("/mfg/bom/new")}>
              <Plus className="h-4 w-4 me-1.5" />
              {t("bom.new")}
            </Button>
          )
        }
        alert={isOffline ? <OfflineBanner message={t("bom.offline_note")} /> : undefined}
      />

      <PageSection padded={false}>
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("bom.search_placeholder")} className="ps-9" />
          </div>
        </div>

        {allTemplates.length === 0 ? (
          <EmptyState
            icon={ListTree}
            title={t("bom.empty_title")}
            description={t("bom.empty_body")}
            action={canManage ? { label: t("bom.new"), onClick: () => navigate("/mfg/bom/new") } : undefined}
          />
        ) : noResults ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">{t("bom.no_results_title")}</p>
            <p className="text-xs text-muted-foreground">{t("bom.no_results_body")}</p>
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>{t("bom.clear_filters")}</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={filtered} keyExtractor={(bt) => bt.id} />
          </div>
        )}
      </PageSection>
    </div>
  );
}
