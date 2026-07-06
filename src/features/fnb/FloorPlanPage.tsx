import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Pencil, Plus, X, ZoomIn, ZoomOut, LayoutGrid, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { useAppearance, dirOf } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useFnbFloor, type FnbTable, type TableShape } from "@/stores/fnbFloor";
import { useFloorPlan } from "./useFloorPlan";
import { findFnbCheck } from "./checks";
import { TableTile, tileDims } from "./TableTile";
import { GuestsCountDialog } from "./GuestsCountDialog";
import { TableEditDialog } from "./TableEditDialog";
import { FloorSectionedList } from "./FloorSectionedList";

const MIN_SCALE = 0.6;
const MAX_SCALE = 1.6;

function FloorSkeleton() {
  return (
    <div className="flex-1 min-h-0 grid grid-cols-3 sm:grid-cols-4 gap-4 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  );
}

export default function FloorPlanPage() {
  const { t } = useTranslation("fnb");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useAppearance();
  const dir = dirOf(lang);
  const can = useCan();
  const navigate = useNavigate();

  const sections = useFnbFloor(s => s.sections);
  const allTables = useFnbFloor(s => s.tables);
  const editMode = useFnbFloor(s => s.editMode);
  const setEditMode = useFnbFloor(s => s.setEditMode);
  const moveTable = useFnbFloor(s => s.moveTable);
  const updateTable = useFnbFloor(s => s.updateTable);
  const addTable = useFnbFloor(s => s.addTable);
  const removeTable = useFnbFloor(s => s.removeTable);
  const addSection = useFnbFloor(s => s.addSection);
  const removeSection = useFnbFloor(s => s.removeSection);
  const openCheck = useFnbFloor(s => s.openCheck);

  const { loading, error, isOffline, forcedEmpty, reload } = useFloorPlan();

  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");
  useEffect(() => {
    if (!sections.some(s => s.id === activeSectionId)) {
      setActiveSectionId(sections[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  const [scale, setScale] = useState(1);
  const [guestsTable, setGuestsTable] = useState<FnbTable | null>(null);
  const [editingTable, setEditingTable] = useState<FnbTable | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [sectionNameAr, setSectionNameAr] = useState("");
  const [sectionNameEn, setSectionNameEn] = useState("");

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  const tables = forcedEmpty ? [] : allTables;
  const sectionTables = useMemo(() => {
    if (forcedNoResults) return [];
    return tables.filter(tb => tb.section_id === activeSectionId);
  }, [tables, activeSectionId, forcedNoResults]);

  const canvasDims = useMemo(() => {
    let maxX = 260, maxY = 220;
    sectionTables.forEach(tb => {
      const { w, h } = tileDims(tb.shape, tb.seats);
      maxX = Math.max(maxX, tb.x + w + 40);
      maxY = Math.max(maxY, tb.y + h + 40);
    });
    return { width: maxX, height: maxY };
  }, [sectionTables]);

  if (!can("fnb.floor.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("floor.permission_required")}</p>
      </div>
    );
  }

  const handleTap = (table: FnbTable) => {
    if (editMode) return;
    if (table.status === "available") {
      setGuestsTable(table);
    } else if (table.status === "occupied" && table.current_check_id) {
      navigate(`/fnb/order/${table.current_check_id}`);
    } else {
      toast.info(t("floor.stub_toast"));
    }
  };

  const handleConfirmGuests = () => {
    if (!guestsTable) return;
    const checkId = `chk_${Date.now()}`;
    openCheck(guestsTable.id, checkId);
    navigate(`/fnb/order/${checkId}`);
  };

  const handleStubAction = () => toast.info(t("floor.stub_toast"));

  const handleRemoveTable = (table: FnbTable) => {
    const result = removeTable(table.id);
    if (result === "blocked_occupied") toast.error(t("floor.remove_table_blocked"));
  };

  const handleRemoveSection = (id: string) => {
    const result = removeSection(id);
    if (result === "blocked_last") toast.error(t("floor.remove_section_last"));
    else if (result === "blocked_has_tables") toast.error(t("floor.remove_section_blocked"));
  };

  const handleAddSection = () => {
    if (!sectionNameAr.trim() || !sectionNameEn.trim()) return;
    addSection(sectionNameAr.trim(), sectionNameEn.trim());
    setSectionNameAr("");
    setSectionNameEn("");
    setAddSectionOpen(false);
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {isOffline && <OfflineBanner message={t("floor.offline_note")} />}

      {/* Header — title · section tabs · editor toggle */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <h1 className="text-base font-semibold text-foreground shrink-0">{t("floor.title")}</h1>

        <Tabs value={activeSectionId} onValueChange={setActiveSectionId} className="flex-1 min-w-0">
          <TabsList className="h-auto p-1 flex-wrap justify-start bg-muted gap-1">
            {sections.map(s => (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className="h-11 px-4 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                {lang === "ar" ? s.name_ar : s.name_en}
                {editMode && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleRemoveSection(s.id); }}
                    className="opacity-60 hover:opacity-100"
                    aria-label={t("floor.remove_section")}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {editMode && (
          <Button variant="outline" size="sm" className="h-11 shrink-0" onClick={() => setAddSectionOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t("floor.add_section")}
          </Button>
        )}

        {can("fnb.floor.edit") && (
          <Button
            variant={editMode ? "solid" : "outline"}
            tone={editMode ? "primary" : undefined}
            size="sm"
            className="h-11 shrink-0"
            onClick={() => setEditMode(!editMode)}
          >
            <Pencil className="h-4 w-4 me-1.5" />
            {editMode ? t("floor.done_editing") : t("floor.edit_mode")}
          </Button>
        )}
      </div>

      {/* Body — five states */}
      {loading ? (
        <FloorSkeleton />
      ) : error ? (
        <ErrorState title={t("floor.error_title")} description={t("floor.error_body")} onRetry={reload} />
      ) : tables.length === 0 ? (
        <EmptyState icon={LayoutGrid} title={t("floor.empty_title")} description={t("floor.empty_body")} />
      ) : sectionTables.length === 0 ? (
        <EmptyState title={t("floor.no_results_title")} description={t("floor.no_results_body")} />
      ) : (
        <>
          {/* Desktop/tablet — visual canvas, pan (scroll) + zoom */}
          <div className="hidden sm:flex flex-1 min-h-0 flex-col gap-2">
            <div className="flex items-center gap-1 shrink-0 self-end">
              <Button
                variant="icon" size="icon" className="h-9 w-9"
                onClick={() => setScale(s => Math.max(MIN_SCALE, +(s - 0.15).toFixed(2)))}
                aria-label={t("floor.zoom_out")}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="icon" size="icon" className="h-9 w-9"
                onClick={() => setScale(s => Math.min(MAX_SCALE, +(s + 0.15).toFixed(2)))}
                aria-label={t("floor.zoom_in")}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border bg-muted/30">
              <div
                className="relative"
                style={{ width: canvasDims.width * scale, height: canvasDims.height * scale }}
                dir={dir}
              >
                {sectionTables.map(tb => {
                  const check = findFnbCheck(tb.current_check_id);
                  return (
                    <TableTile
                      key={tb.id}
                      table={tb}
                      scale={scale}
                      editMode={editMode}
                      checkTotal={check?.totals.grand_total}
                      checkOpenedAt={check?.opened_at}
                      onTap={() => handleTap(tb)}
                      onMove={moveTable}
                      onEditRequest={() => setEditingTable(tb)}
                      onRemove={() => handleRemoveTable(tb)}
                      onStubAction={handleStubAction}
                    />
                  );
                })}

                {editMode && (
                  <button
                    type="button"
                    onClick={() => addTable(activeSectionId)}
                    className="absolute bottom-3 end-3 h-11 w-11 rounded-full bg-brand text-on-brand shadow-lg flex items-center justify-center hover:bg-brand-dark transition-colors"
                    aria-label={t("floor.add_table")}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Small screens — sectioned list fallback, same statuses */}
          <div className="sm:hidden flex-1 min-h-0 overflow-auto">
            <FloorSectionedList sections={sections} tables={tables} onTapTable={handleTap} />
            {editMode && (
              <Button
                variant="outline" size="sm" className="h-11 w-full mt-3"
                onClick={() => addTable(activeSectionId)}
              >
                <Plus className="h-4 w-4 me-1.5" />
                {t("floor.add_table")}
              </Button>
            )}
          </div>
        </>
      )}

      <GuestsCountDialog
        table={guestsTable}
        open={!!guestsTable}
        onOpenChange={(o) => !o && setGuestsTable(null)}
        onConfirm={handleConfirmGuests}
      />

      <TableEditDialog
        table={editingTable}
        open={!!editingTable}
        onOpenChange={(o) => !o && setEditingTable(null)}
        onSave={(seats, shape: TableShape) => editingTable && updateTable(editingTable.id, { seats, shape })}
      />

      <ModalShell
        open={addSectionOpen}
        onOpenChange={setAddSectionOpen}
        title={t("floor.add_section")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddSectionOpen(false)}>{tCommon("cancel")}</Button>
            <Button variant="solid" tone="primary" onClick={handleAddSection}>{tCommon("save")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            value={sectionNameAr}
            onChange={e => setSectionNameAr(e.target.value)}
            placeholder={t("floor.section_name_ar_placeholder")}
            className="h-11"
          />
          <Input
            value={sectionNameEn}
            onChange={e => setSectionNameEn(e.target.value)}
            placeholder={t("floor.section_name_en_placeholder")}
            className="h-11"
          />
        </div>
      </ModalShell>
    </div>
  );
}
