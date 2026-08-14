import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Upload, ClipboardList, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/patterns/PageHeader";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton } from "@/components/patterns/Skeletons";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useHealthcareCatalog } from "@/stores/healthcareCatalog";
import { useMockState } from "../useMockState";
import { getProvider, providerName } from "@/lib/mock/healthcare";
import { CatalogItemFormModal } from "./CatalogItemFormModal";
import { CsvImportModal } from "./CsvImportModal";
import type { HcCatalogItem } from "@/features/healthcare/types";

type TypeFilter = "all" | HcCatalogItem["type"];

/**
 * /healthcare/catalog — Service & Test catalog (spec §9), admin. Feature-flag
 * awareness (§9.3 — "consult-only clinic with no lab → lab section hides
 * without breaking") lives in the *consuming* screens, not here: Encounter's
 * Labs/Radiology tab (Prompt 2) and the Lab queue (Prompt 5) already degrade
 * to their own empty states when there's nothing of that type in this
 * catalog — this admin page's job is managing every type in one place.
 */
export function CatalogPage() {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const can = useCan();

  const itemsMap = useHealthcareCatalog((s) => s.items);
  const toggleActive = useHealthcareCatalog((s) => s.toggleActive);

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HcCatalogItem | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  const allItems = forcedEmpty ? [] : Object.values(itemsMap);
  const filtered = useMemo(() => {
    let list = allItems;
    if (typeFilter !== "all") list = list.filter((i) => i.type === typeFilter);
    if (search.trim()) list = list.filter((i) => i.name_ar.toLowerCase().includes(search.trim().toLowerCase()));
    return list;
  }, [allItems, typeFilter, search]);

  const noResults = forcedNoResults || (allItems.length > 0 && filtered.length === 0);

  function clearFilters() { setSearch(""); setTypeFilter("all"); }
  function handleNewItem() { setEditingItem(undefined); setItemModalOpen(true); }
  function handleEditItem(item: HcCatalogItem) { setEditingItem(item); setItemModalOpen(true); }

  if (!can("healthcare.catalog.manage")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("catalog.permission_required")}</p>
      </div>
    );
  }

  const columns: Column<HcCatalogItem>[] = [
    { key: "name", header: t("catalog.field_name"), cell: (i) => <span className="font-medium text-foreground">{i.name_ar}</span> },
    { key: "type", header: t("catalog.field_type"), cell: (i) => t(`catalog.type_${i.type}`) },
    { key: "price", header: t("catalog.field_price"), numeric: true, cell: (i) => formatMoney(i.price, lang) },
    {
      key: "provider", header: t("catalog.field_default_provider"),
      cell: (i) => { const p = getProvider(i.default_provider); return p ? providerName(p, lang) : "—"; },
    },
    {
      key: "status", header: t("catalog.field_status"),
      cell: (i) => (
        <button type="button" onClick={() => toggleActive(i.id)}>
          <StatusPill variant={i.active ? "approved" : "inactive"} label={t(i.active ? "catalog.status_active" : "catalog.status_suspended")} />
        </button>
      ),
    },
    {
      key: "actions", header: "",
      cell: (i) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditItem(i)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {isOffline && <OfflineBanner />}

      <PageHeader
        title={t("catalog.title")}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 me-1.5" /> {t("catalog.import_cta")}
            </Button>
            <Button size="sm" onClick={handleNewItem}>
              <Plus className="h-4 w-4 me-1.5" /> {t("catalog.new_item")}
            </Button>
          </div>
        }
      />

      {allItems.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("catalog.search_placeholder")} className="h-9 max-w-xs" />
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("patients.filter_all")}</SelectItem>
              <SelectItem value="consult">{t("catalog.type_consult")}</SelectItem>
              <SelectItem value="lab">{t("catalog.type_lab")}</SelectItem>
              <SelectItem value="radiology">{t("catalog.type_radiology")}</SelectItem>
              <SelectItem value="procedure">{t("catalog.type_procedure")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={6} rows={5} />
      ) : error ? (
        <ErrorState title={t("catalog.error_title")} onRetry={reload} />
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t("catalog.empty_title")}
          action={{ label: t("catalog.empty_add"), onClick: handleNewItem }}
        />
      ) : noResults ? (
        <EmptyState
          title={t("today.no_results_title")}
          description={t("today.no_results_body")}
          action={{ label: t("today.clear_filters"), onClick: clearFilters }}
        />
      ) : (
        <div className="rounded-lg border border-border overflow-auto">
          <DataTable columns={columns} data={filtered} keyExtractor={(i) => i.id} />
        </div>
      )}

      <CatalogItemFormModal open={itemModalOpen} onOpenChange={setItemModalOpen} editingItem={editingItem} />
      <CsvImportModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
