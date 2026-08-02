import { Fragment, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus, FileSpreadsheet, Search, GripVertical, Pencil, Wallet, Lock, ChevronDown, ClipboardList,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton } from "@/components/patterns/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore } from "@/stores/projectsStore";
import { useConstructionStore } from "@/stores/constructionStore";
import { getPhases } from "@/lib/mock/construction";
import { useMockState } from "@/features/projects/useMockState";
import type { BoqItem } from "@/features/construction/types";
import type { BoqItemFormInput } from "@/stores/constructionStore";
import { BoqItemFormDialog } from "./BoqItemFormDialog";
import { CostBudgetDrawer } from "./CostBudgetDrawer";
import { BoqImportDrawer } from "./BoqImportDrawer";

function groupBySection(items: BoqItem[]): { label: string | null; items: BoqItem[] }[] {
  const groups: { label: string | null; items: BoqItem[] }[] = [];
  for (const item of items) {
    const label = item.section_header_ar ?? null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

interface SortableRowProps {
  item: BoqItem;
  disabled: boolean;
  hideCost: boolean;
  lang: "ar" | "en";
  onEdit: () => void;
}

function SortableItemRow({ item, disabled, hideCost, lang, onEdit }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });
  const { t } = useTranslation("construction");
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <TableRow ref={setNodeRef} style={style} className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer" onClick={onEdit}>
      <TableCell className="px-2 py-2 w-8">
        {!disabled && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            aria-label={t("boq.reorder_handle")}
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </TableCell>
      <TableCell className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{item.code}</TableCell>
      <TableCell className="px-3 py-2 text-sm">{item.description_ar}</TableCell>
      <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{item.unit_ar}</TableCell>
      <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{item.estimated_qty}</TableCell>
      <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{formatMoney(item.unit_price, lang)}</TableCell>
      <TableCell className="px-3 py-2 text-sm font-medium tabular-nums text-end">{formatMoney(item.value, lang)}</TableCell>
      {!hideCost && (
        <>
          <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{formatMoney(item.estimated_unit_cost, lang)}</TableCell>
          <TableCell className={cn("px-3 py-2 text-sm font-medium tabular-nums text-end", item.expected_margin < 0 ? "text-danger-text" : "text-success-text")}>
            {formatMoney(item.expected_margin, lang)}
          </TableCell>
        </>
      )}
      <TableCell className="px-2 py-2 w-8">
        {!disabled && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label={t("boq.edit_item")}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function BoqEditorPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();
  const can = useCan();

  const project = useProjectsStore((s) => s.projects[id]);
  const boqItemsAll = useConstructionStore((s) => s.boq_items);
  const itemOrder = useConstructionStore((s) => s.item_order);
  const costBudgetBreakdown = useConstructionStore((s) => s.cost_budget_breakdown);
  const hideCost = useConstructionStore((s) => s.hide_cost);
  const toggleHideCost = useConstructionStore((s) => s.toggleHideCost);
  const addBoqItem = useConstructionStore((s) => s.addBoqItem);
  const updateBoqItem = useConstructionStore((s) => s.updateBoqItem);
  const reorderBoqItems = useConstructionStore((s) => s.reorderBoqItems);
  const setCostBudgetBreakdown = useConstructionStore((s) => s.setCostBudgetBreakdown);
  const importBoqItems = useConstructionStore((s) => s.importBoqItems);

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const phases = useMemo(() => getPhases(id), [id]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const activePhaseId = selectedPhaseId ?? phases[0]?.id ?? null;

  const [search, setSearch] = useState("");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BoqItem | null>(null);
  const [pendingSection, setPendingSection] = useState<string | undefined>(undefined);
  const [costBudgetOpen, setCostBudgetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const locked = useConstructionStore((s) => s.contract_terms.locked);
  const canEdit = can("construction.boq.edit") && !locked;

  const contractValue = useMemo(() => Object.values(boqItemsAll).reduce((s, i) => s + i.value, 0), [boqItemsAll]);

  const phaseSummaries = useMemo(() => {
    return phases.map((phase) => {
      const ids = forcedEmpty ? [] : (itemOrder[phase.id] ?? []);
      const items = ids.map((iid) => boqItemsAll[iid]).filter(Boolean);
      return {
        phase,
        items,
        sellTotal: items.reduce((s, i) => s + i.value, 0),
        costTotal: items.reduce((s, i) => s + i.estimated_cost, 0),
        marginTotal: items.reduce((s, i) => s + i.expected_margin, 0),
      };
    });
  }, [phases, itemOrder, boqItemsAll, forcedEmpty]);

  const activeSummary = phaseSummaries.find((p) => p.phase.id === activePhaseId) ?? null;

  const filteredItems = useMemo(() => {
    if (!activeSummary) return [];
    if (!search.trim()) return activeSummary.items;
    const q = search.trim().toLowerCase();
    return activeSummary.items.filter((i) => i.description_ar.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [activeSummary, search]);

  const noResults = search.trim().length > 0 && (activeSummary?.items.length ?? 0) > 0 && filteredItems.length === 0;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(ev: DragEndEvent) {
    if (!activePhaseId || !activeSummary) return;
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const ids = activeSummary.items.map((i) => i.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    reorderBoqItems(id, activePhaseId, arrayMove(ids, oldIndex, newIndex));
  }

  function openAddItem(section?: string) {
    setEditingItem(null);
    setPendingSection(section);
    setItemDialogOpen(true);
  }

  function openEditItem(item: BoqItem) {
    if (!canEdit) return;
    setEditingItem(item);
    setItemDialogOpen(true);
  }

  function handleSaveItem(input: BoqItemFormInput) {
    if (editingItem) updateBoqItem(id, editingItem.id, input);
    else addBoqItem(id, input);
  }

  function handleAddSection() {
    const label = window.prompt(t("boq.add_section"));
    if (label && label.trim()) openAddItem(label.trim());
  }

  if (!project) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("boq.title")} />
        <TableSkeleton rows={6} cols={7} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("boq.title")} />
        <PageSection><ErrorState onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("boq.title")}
        subtitle={formatMoney(contractValue, lang)}
        alert={locked ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-warning-tint text-warning-text text-sm font-medium rounded border border-warning/20">
            <Lock className="h-4 w-4 shrink-0" />
            <span>{t("boq.locked")}</span>
          </div>
        ) : undefined}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 me-2">
              <Switch id="hide-cost" checked={hideCost} onCheckedChange={toggleHideCost} />
              <Label htmlFor="hide-cost" className="text-sm cursor-pointer">{t("boq.hide_cost")}</Label>
            </div>
            {canEdit && (
              <>
                <Button size="sm" variant="outline" onClick={handleAddSection}>
                  {t("boq.add_section")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4 me-1.5" />{t("boq.import")}
                </Button>
                <Button size="sm" onClick={() => openAddItem()}>
                  <Plus className="h-4 w-4 me-1.5" />{t("boq.add_item")}
                </Button>
              </>
            )}
          </div>
        }
      />

      {isOffline && <OfflineBanner message={t("boq.offline_note")} />}

      <div className="lg:flex lg:gap-4 items-start">
        {/* Start rail — phase tree (desktop) */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-1">
          {phaseSummaries.map(({ phase, sellTotal, costTotal }) => (
            <button
              key={phase.id}
              type="button"
              onClick={() => setSelectedPhaseId(phase.id)}
              className={cn(
                "w-full text-start rounded border p-3 space-y-1 transition-colors",
                phase.id === activePhaseId ? "border-brand bg-brand-tint" : "border-border hover:bg-muted/40"
              )}
            >
              <p className={cn("text-sm font-medium truncate", phase.id === activePhaseId ? "text-brand-text" : "text-foreground")}>
                {lang === "ar" ? phase.name_ar : phase.name_en}
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">{formatMoney(sellTotal, lang)}</p>
              {!hideCost && <p className="text-xs tabular-nums text-muted-foreground">{t("boq.est_cost")}: {formatMoney(costTotal, lang)}</p>}
            </button>
          ))}
        </aside>

        {/* Mobile phase accordion */}
        <div className="lg:hidden space-y-2 mb-2">
          {phaseSummaries.map(({ phase, sellTotal }) => (
            <button
              key={phase.id}
              type="button"
              onClick={() => setSelectedPhaseId(phase.id)}
              className={cn(
                "w-full flex items-center justify-between rounded border p-3",
                phase.id === activePhaseId ? "border-brand bg-brand-tint" : "border-border"
              )}
            >
              <span className="text-sm font-medium">{lang === "ar" ? phase.name_ar : phase.name_en}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">{formatMoney(sellTotal, lang)}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", phase.id === activePhaseId && "rotate-180")} />
              </span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-3">
          {activeSummary && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("boq.search_placeholder")} className="ps-9" />
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setCostBudgetOpen(true)}>
                  <Wallet className="h-4 w-4 me-1.5" />{t("cost_budget.title")}
                </Button>
              )}
            </div>
          )}

          {!activeSummary ? (
            <PageSection><EmptyState icon={ClipboardList} title={t("boq.select_phase")} /></PageSection>
          ) : noResults ? (
            <PageSection><EmptyState title={t("boq.no_results")} /></PageSection>
          ) : activeSummary.items.length === 0 ? (
            <PageSection>
              <EmptyState
                icon={ClipboardList}
                title={t("boq.no_items_title")}
                action={canEdit ? { label: t("boq.no_items_cta"), onClick: () => openAddItem() } : undefined}
              />
            </PageSection>
          ) : (
            <>
              {/* Desktop table */}
              <PageSection padded={false} className="hidden lg:block">
                <div className="overflow-x-auto">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/30 z-10">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-8" />
                          <TableHead className="text-xs">{t("boq.code")}</TableHead>
                          <TableHead className="text-xs">{t("boq.item")}</TableHead>
                          <TableHead className="text-xs">{t("boq.unit")}</TableHead>
                          <TableHead className="text-xs text-end">{t("boq.qty")}</TableHead>
                          <TableHead className="text-xs text-end">{t("boq.unit_price")}</TableHead>
                          <TableHead className="text-xs text-end">{t("boq.value")}</TableHead>
                          {!hideCost && (
                            <>
                              <TableHead className="text-xs text-end">{t("boq.est_cost")}</TableHead>
                              <TableHead className="text-xs text-end">{t("boq.margin")}</TableHead>
                            </>
                          )}
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext items={filteredItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                          {groupBySection(filteredItems).map((group, gi) => (
                            <Fragment key={gi}>
                              {group.label && (
                                <TableRow className="bg-muted/20 hover:bg-muted/20">
                                  <TableCell colSpan={hideCost ? 7 : 9} className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                                    {group.label}
                                  </TableCell>
                                </TableRow>
                              )}
                              {group.items.map((item) => (
                                <SortableItemRow
                                  key={item.id}
                                  item={item}
                                  disabled={!canEdit}
                                  hideCost={hideCost}
                                  lang={lang}
                                  onEdit={() => openEditItem(item)}
                                />
                              ))}
                            </Fragment>
                          ))}
                        </SortableContext>
                        <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={2} className="px-3 py-2 text-sm">{t("boq.phase_totals")}</TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell />
                          <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{formatMoney(activeSummary.sellTotal, lang)}</TableCell>
                          {!hideCost && (
                            <>
                              <TableCell className="px-3 py-2 text-sm tabular-nums text-end">{formatMoney(activeSummary.costTotal, lang)}</TableCell>
                              <TableCell className={cn("px-3 py-2 text-sm tabular-nums text-end", activeSummary.marginTotal < 0 ? "text-danger-text" : "text-success-text")}>
                                {formatMoney(activeSummary.marginTotal, lang)}
                              </TableCell>
                            </>
                          )}
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              </PageSection>

              {/* Mobile item cards */}
              <div className="lg:hidden space-y-2">
                {groupBySection(filteredItems).map((group, gi) => (
                  <div key={gi} className="space-y-2">
                    {group.label && <p className="text-xs font-semibold text-muted-foreground px-1">{group.label}</p>}
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openEditItem(item)}
                        className="w-full text-start rounded border border-border p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{item.description_ar}</span>
                          {canEdit && <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                          <span>{item.estimated_qty} {item.unit_ar}</span>
                          <span>{formatMoney(item.value, lang)}</span>
                        </div>
                        {!hideCost && (
                          <div className={cn("text-xs tabular-nums text-end", item.expected_margin < 0 ? "text-danger-text" : "text-success-text")}>
                            {t("boq.margin")}: {formatMoney(item.expected_margin, lang)}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
                <div className="rounded border border-border p-3 flex items-center justify-between font-semibold text-sm">
                  <span>{t("boq.phase_totals")}</span>
                  <span className="tabular-nums">{formatMoney(activeSummary.sellTotal, lang)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <BoqItemFormDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        phaseRef={activePhaseId ?? ""}
        item={editingItem}
        defaultSection={pendingSection}
        onSave={handleSaveItem}
      />

      {activeSummary && (
        <>
          <CostBudgetDrawer
            open={costBudgetOpen}
            onOpenChange={setCostBudgetOpen}
            phaseLabel={lang === "ar" ? activeSummary.phase.name_ar : activeSummary.phase.name_en}
            phaseEstimatedCost={activeSummary.costTotal}
            breakdown={costBudgetBreakdown[activeSummary.phase.id]}
            onSave={(breakdown) => setCostBudgetBreakdown(id, activeSummary.phase.id, breakdown)}
          />
          <BoqImportDrawer
            open={importOpen}
            onOpenChange={setImportOpen}
            phaseLabel={lang === "ar" ? activeSummary.phase.name_ar : activeSummary.phase.name_en}
            onImport={(rows) => importBoqItems(id, activeSummary.phase.id, rows).count}
          />
        </>
      )}
    </div>
  );
}
