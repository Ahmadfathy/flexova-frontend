import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState }  from "@/components/patterns/EmptyState";
import { ErrorState }  from "@/components/patterns/ErrorState";
import { StatusPill }  from "@/components/patterns/StatusPill";
import { Skeleton }    from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, Warehouse, MoreVertical, Star, Loader2 } from "lucide-react";

import { formatMoney } from "@/lib/format";
import { cn }          from "@/lib/utils";
import { useCan }      from "@/lib/permissions";
import { useItems }    from "../items/useItems";
import type { InventoryWarehouse } from "../items/types";

/* ─── StatusPill variant maps ────────────────────────────────── */

const TYPE_VARIANT: Record<InventoryWarehouse["type"], "active" | "pending" | "rejected"> = {
  storage: "active",
  sale:    "pending",
  damaged: "rejected",
};

const STATUS_VARIANT: Record<InventoryWarehouse["status"], "active" | "inactive"> = {
  active:    "active",
  suspended: "inactive",
};

/* ─── Skeleton ───────────────────────────────────────────────── */

function WhSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[140, 72, 80, 80, 60, 100, 32].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          style={{ opacity: 1 - i * 0.25 }}
        >
          <Skeleton className="h-3.5 flex-1 max-w-[160px]" />
          <Skeleton className="h-3.5 w-16 hidden sm:block" />
          <Skeleton className="h-3.5 w-20 hidden md:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full hidden sm:block" />
          <Skeleton className="h-3.5 w-24 hidden lg:block tabular-nums ms-auto" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ─── Form field types ───────────────────────────────────────── */

interface WhForm {
  name_ar:    string;
  name_en:    string;
  code:       string;
  branch_id:  string;
  type:       InventoryWarehouse["type"];
  status:     InventoryWarehouse["status"];
  is_default: boolean;
}

const EMPTY_FORM: WhForm = {
  name_ar:    "",
  name_en:    "",
  code:       "",
  branch_id:  "",
  type:       "storage",
  status:     "active",
  is_default: false,
};

function whToForm(wh: InventoryWarehouse): WhForm {
  return {
    name_ar:    wh.name_ar,
    name_en:    wh.name_en,
    code:       wh.code,
    branch_id:  wh.branch_id,
    type:       wh.type,
    status:     wh.status,
    is_default: wh.is_default,
  };
}

/* ─── Warehouse form dialog ──────────────────────────────────── */

interface WhFormDialogProps {
  mode:       "add" | "edit";
  warehouse?: InventoryWarehouse;
  lang:       "ar" | "en";
  t:          ReturnType<typeof useTranslation<"inventory">>["t"];
  onClose:    () => void;
}

function WhFormDialog({ mode, warehouse, lang, t, onClose }: WhFormDialogProps) {
  const [form,   setForm]   = useState<WhForm>(
    () => (mode === "edit" && warehouse ? whToForm(warehouse) : EMPTY_FORM)
  );
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof WhForm>(k: K, v: WhForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name_ar.trim()) {
      setError(t("warehouses.form_name_required"));
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 650));
    setSaving(false);
    onClose();
  }

  const title = mode === "edit" ? t("warehouses.edit") : t("warehouses.new");

  const branchOptions = [
    { id: "br_main", label: lang === "ar" ? "الفرع الرئيسي" : "Main Branch" },
    { id: "br_nasr", label: lang === "ar" ? "فرع مدينة نصر" : "Nasr City Branch" },
  ];

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader className="text-start">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-1">
        {/* Name AR — required */}
        <div className="space-y-1.5">
          <Label htmlFor="wh-name-ar">
            {t("warehouses.form_name")}
            <span className="text-destructive ms-0.5">*</span>
          </Label>
          <Input
            id="wh-name-ar"
            value={form.name_ar}
            onChange={(e) => { set("name_ar", e.target.value); setError(""); }}
            placeholder={lang === "ar" ? "مثال: المخزن الرئيسي" : "e.g. Main Warehouse"}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Name EN */}
        <div className="space-y-1.5">
          <Label htmlFor="wh-name-en">
            {t("warehouses.form_name")} (EN)
          </Label>
          <Input
            id="wh-name-en"
            value={form.name_en}
            onChange={(e) => set("name_en", e.target.value)}
            placeholder="e.g. Main Warehouse"
          />
        </div>

        {/* Code + Branch */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wh-code">{t("warehouses.form_code")}</Label>
            <Input
              id="wh-code"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="WH-01"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-branch">{t("warehouses.form_branch")}</Label>
            <Select
              value={form.branch_id || "__none__"}
              onValueChange={(v) => set("branch_id", v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="wh-branch">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {branchOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <Label htmlFor="wh-type">{t("warehouses.form_type")}</Label>
          <Select
            value={form.type}
            onValueChange={(v) => set("type", v as InventoryWarehouse["type"])}
          >
            <SelectTrigger id="wh-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="storage">{t("warehouses.types.storage")}</SelectItem>
              <SelectItem value="sale">{t("warehouses.types.sale")}</SelectItem>
              <SelectItem value="damaged">{t("warehouses.types.damaged")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{t("warehouses.form_status")}</p>
            <p className="text-xs text-muted-foreground">
              {form.status === "active" ? t("status.active") : t("status.suspended")}
            </p>
          </div>
          <Switch
            checked={form.status === "active"}
            onCheckedChange={(v) => set("status", v ? "active" : "suspended")}
          />
        </div>

        {/* Default */}
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{t("warehouses.form_is_default")}</p>
            <p className="text-xs text-muted-foreground">
              {t("warehouses.form_is_default_hint")}
            </p>
          </div>
          <Switch
            checked={form.is_default}
            onCheckedChange={(v) => set("is_default", v)}
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          {t("actions.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
          {t("actions.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export function WarehousesPage() {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();

  const { data, loading, error, reload } = useItems();

  const warehouses: InventoryWarehouse[] = useMemo(
    () => data?.warehouses ?? [],
    [data]
  );

  const [whDialog, setWhDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    warehouse?: InventoryWarehouse;
  }>({ open: false, mode: "add" });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    warehouse?: InventoryWarehouse;
  }>({ open: false });

  const openAdd   = () => setWhDialog({ open: true, mode: "add" });
  const openEdit  = (wh: InventoryWarehouse) => setWhDialog({ open: true, mode: "edit", warehouse: wh });
  const openDelete = (wh: InventoryWarehouse) => setDeleteDialog({ open: true, warehouse: wh });

  const isDeleteBlocked = (wh: InventoryWarehouse) => wh.stock_value > 0;

  const totalCount   = warehouses.length;
  const showSkeleton = loading && !data;
  const showError    = !!error;
  const isEmpty      = !showSkeleton && !showError && totalCount === 0;
  const showTable    = !showSkeleton && !showError && !isEmpty;

  const pageActions = can("inventory.warehouse.manage") ? (
    <Button size="sm" onClick={openAdd}>
      <Plus className="h-4 w-4 me-1.5" />
      {t("warehouses.new")}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("warehouses.title")}
        subtitle={totalCount > 0 ? t("warehouses.count", { n: totalCount }) : undefined}
        actions={pageActions}
      />

      <PageSection padded={false}>
        {showSkeleton && <WhSkeleton />}

        {showError && (
          <div className="p-6">
            <ErrorState description={t("errors.load")} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState
              icon={Warehouse}
              title={t("warehouses.empty_title")}
              description={t("warehouses.empty_sub")}
              action={
                can("inventory.warehouse.manage")
                  ? { label: t("warehouses.new"), onClick: openAdd }
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
                    { key: "name",        label: t("columns.name"),        cls: "" },
                    { key: "code",        label: t("columns.code"),        cls: "hidden sm:table-cell" },
                    { key: "branch",      label: t("columns.branch"),      cls: "hidden md:table-cell" },
                    { key: "type",        label: t("columns.type"),        cls: "hidden sm:table-cell" },
                    { key: "status",      label: t("columns.status"),      cls: "" },
                    { key: "stock_value", label: t("columns.stock_value"), cls: "text-end hidden lg:table-cell" },
                    { key: "actions",     label: "",                       cls: "w-10" },
                  ].map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "h-10 py-2 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap",
                        col.cls
                      )}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {warehouses.map((wh) => (
                  <TableRow
                    key={wh.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                  >
                    {/* Name + default star */}
                    <TableCell className="px-3 py-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-sm leading-tight truncate">
                          {lang === "ar" ? wh.name_ar : wh.name_en}
                        </span>
                        {wh.is_default && (
                          <Star
                            className="h-3 w-3 text-warning fill-warning shrink-0"
                            aria-label={t("warehouses.default_badge")}
                          />
                        )}
                      </div>
                    </TableCell>

                    {/* Code */}
                    <TableCell className="px-3 py-3 hidden sm:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{wh.code}</span>
                    </TableCell>

                    {/* Branch */}
                    <TableCell className="px-3 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {wh.branch_id}
                    </TableCell>

                    {/* Type */}
                    <TableCell className="px-3 py-3 hidden sm:table-cell">
                      <StatusPill
                        variant={TYPE_VARIANT[wh.type]}
                        label={t(`warehouses.types.${wh.type}`)}
                      />
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-3 py-3">
                      <StatusPill
                        variant={STATUS_VARIANT[wh.status]}
                        label={t(`status.${wh.status}`)}
                      />
                    </TableCell>

                    {/* Stock value */}
                    <TableCell className="px-3 py-3 text-end tabular-nums text-sm hidden lg:table-cell">
                      <span className="font-medium">{formatMoney(wh.stock_value, lang)}</span>
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
                          {can("inventory.warehouse.manage") && (
                            <DropdownMenuItem onClick={() => openEdit(wh)}>
                              {t("actions.edit")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>{t("actions.view_items")}</DropdownMenuItem>
                          {can("inventory.warehouse.manage") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => openDelete(wh)}
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

            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("warehouses.showing", { from: 1, to: totalCount, total: totalCount })}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Star className="h-3 w-3 text-warning fill-warning" />
                {t("warehouses.default_badge")}
              </div>
            </div>
          </>
        )}
      </PageSection>

      {/* ─── Add / Edit Dialog ──────────────────────────────────── */}
      <Dialog
        open={whDialog.open}
        onOpenChange={(open) => !open && setWhDialog((d) => ({ ...d, open: false }))}
      >
        {whDialog.open && (
          <WhFormDialog
            key={`${whDialog.mode}-${whDialog.warehouse?.id ?? "new"}`}
            mode={whDialog.mode}
            warehouse={whDialog.warehouse}
            lang={lang}
            t={t}
            onClose={() => setWhDialog((d) => ({ ...d, open: false }))}
          />
        )}
      </Dialog>

      {/* ─── Delete AlertDialog ──────────────────────────────────── */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false })}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>
              {deleteDialog.warehouse && isDeleteBlocked(deleteDialog.warehouse)
                ? t("warehouses.cant_delete")
                : t("warehouses.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.warehouse && isDeleteBlocked(deleteDialog.warehouse)
                ? t("warehouses.delete_blocked_desc")
                : t("warehouses.delete_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            {deleteDialog.warehouse && isDeleteBlocked(deleteDialog.warehouse) ? (
              <AlertDialogCancel>{t("actions.close")}</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => setDeleteDialog({ open: false })}
                >
                  {t("actions.confirm_delete")}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
