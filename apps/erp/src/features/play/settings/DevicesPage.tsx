import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Search, Layers, Pencil, MoreVertical, Lock, Boxes } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { DataTable, RowActionsContent, RowActionItem, type Column } from "@/components/patterns/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePlayDevices } from "@/stores/playDevices";
import { usePlayDeviceTypes } from "@/stores/playDeviceTypes";
import { getBranches } from "@/lib/mock/play";
import type { Device, DeviceState } from "@/features/play/types";
import { DeviceDialog } from "./DeviceDialog";
import { BulkAddDevicesDialog } from "./BulkAddDevicesDialog";
import { useDevicesList } from "./useDevicesList";

const STATE_PILL: Record<DeviceState, PillVariant> = {
  free: "approved",
  busy: "active",
  reserved: "pending",
  paused: "in-progress",
  out_of_service: "rejected",
};

export default function DevicesPage() {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();
  const can = useCan();

  const devices = usePlayDevices((s) => s.devices);
  const createDevice = usePlayDevices((s) => s.createDevice);
  const updateDevice = usePlayDevices((s) => s.updateDevice);
  const bulkAddDevices = usePlayDevices((s) => s.bulkAddDevices);

  const deviceTypes = usePlayDeviceTypes((s) => s.deviceTypes);

  const { loading, error, isOffline, forcedEmpty, reload } = useDevicesList();

  const branches = useMemo(() => getBranches(), []);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  function deviceTypeName(id: string) {
    const dt = deviceTypes[id];
    return dt ? (lang === "ar" ? dt.name_ar : dt.name_en) : id;
  }
  function branchName(id: string) {
    const b = branches.find((br) => br.id === id);
    return b ? (lang === "ar" ? b.name_ar : b.name_en) : id;
  }

  if (!can("play.config")) {
    return (
      <div>
        <PageHeader title={t("dev.title")} />
        <PageSection>
          <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-16 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("dev.permission_required")}</p>
          </div>
        </PageSection>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dev.title")} />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dev.title")} />
        <PageSection><ErrorState title={t("dev.error_title")} description={t("dev.error_body")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const allDevices = forcedEmpty ? [] : Object.values(devices);

  const branchScoped = branchFilter === "all" ? allDevices : allDevices.filter((d) => d.branch_id === branchFilter);

  const filtered = search
    ? branchScoped.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase()))
    : branchScoped;

  const noResults = forcedNoResults || (allDevices.length > 0 && filtered.length === 0);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(d: Device) {
    setEditing(d);
    setDialogOpen(true);
  }
  function handleSave(input: Parameters<typeof createDevice>[0]) {
    if (editing) updateDevice(editing.id, input);
    else createDevice(input);
    setDialogOpen(false);
    toast.success(t("dev.saved_toast"));
  }
  function handleBulkConfirm(input: Parameters<typeof bulkAddDevices>[0]) {
    const created = bulkAddDevices(input);
    setBulkOpen(false);
    toast.success(t("dev.bulk_saved_toast", { n: created.length }));
  }

  const columns: Column<Device>[] = [
    {
      key: "name", header: t("dev.col_name"),
      cell: (d) => <span className="font-mono text-sm font-medium">{d.name}</span>,
    },
    { key: "type", header: t("dev.col_type"), cell: (d) => deviceTypeName(d.device_type_id) },
    { key: "branch", header: t("dev.col_branch"), cell: (d) => branchName(d.branch_id) },
    {
      key: "state", header: t("dev.col_state"),
      cell: (d) => <StatusPill variant={STATE_PILL[d.state]} label={t(`device.${d.state === "out_of_service" ? "oos" : d.state}`)} />,
    },
    {
      key: "notes", header: t("dev.col_notes"),
      cell: (d) => d.notes ? <span className="text-sm text-muted-foreground">{d.notes}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "actions", header: t("dev.col_actions"),
      cell: (d) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <RowActionsContent>
            <RowActionItem icon={Pencil} onClick={() => openEdit(d)}>{t("dev.edit_btn")}</RowActionItem>
          </RowActionsContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("dev.title")}
        count={allDevices.length > 0 ? t("dev.count", { n: allDevices.length }) : undefined}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              <Layers className="h-4 w-4 me-1.5" />
              {t("dev.bulk")}
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 me-1.5" />
              {t("dev.new")}
            </Button>
          </>
        }
        alert={isOffline ? <OfflineBanner message={t("dev.offline_note")} /> : undefined}
      />

      <PageSection padded={false}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("dev.search_placeholder")} className="ps-9" />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("dev.branch_all")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{lang === "ar" ? b.name_ar : b.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {allDevices.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={t("dev.empty_title")}
            description={t("dev.empty_body")}
            action={{ label: t("dev.new"), onClick: openCreate }}
          />
        ) : noResults ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">{t("dev.no_results_title")}</p>
            <p className="text-xs text-muted-foreground">{t("dev.no_results_body")}</p>
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>{t("dev.clear_filters")}</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={filtered} keyExtractor={(d) => d.id} />
          </div>
        )}
      </PageSection>

      <DeviceDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSave={handleSave}
      />
      <BulkAddDevicesDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onConfirm={handleBulkConfirm}
      />
    </div>
  );
}
