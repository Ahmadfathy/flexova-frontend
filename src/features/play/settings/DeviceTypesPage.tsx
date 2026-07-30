import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Search, Gamepad2, Pencil, MoreVertical, Lock } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { DataTable, RowActionsContent, RowActionItem, type Column } from "@/components/patterns/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { usePlayDeviceTypes } from "@/stores/playDeviceTypes";
import { getRatePlans, getServiceItems } from "@/lib/mock/play";
import type { DeviceType } from "@/features/play/types";
import { DEVICE_TYPE_ICONS } from "./deviceTypeOptions";
import { DeviceTypeDialog } from "./DeviceTypeDialog";
import { useDeviceTypesList } from "./useDeviceTypesList";

export default function DeviceTypesPage() {
  const { t } = useTranslation("play");
  const { lang } = useAppearance();
  const can = useCan();

  const deviceTypes = usePlayDeviceTypes((s) => s.deviceTypes);
  const createDeviceType = usePlayDeviceTypes((s) => s.createDeviceType);
  const updateDeviceType = usePlayDeviceTypes((s) => s.updateDeviceType);

  const { loading, error, isOffline, forcedEmpty, reload } = useDeviceTypesList();

  const ratePlans = useMemo(() => getRatePlans(), []);
  const serviceItems = useMemo(() => getServiceItems(), []);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceType | null>(null);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  function ratePlanName(id: string) {
    const rp = ratePlans.find((r) => r.id === id);
    return rp ? (lang === "ar" ? rp.name_ar : rp.name_en) : id;
  }
  function serviceItemName(id: string) {
    const si = serviceItems.find((s) => s.id === id);
    return si ? (lang === "ar" ? si.name_ar : si.name_en) : id;
  }

  if (!can("play.config")) {
    return (
      <div>
        <PageHeader title={t("dt.title")} />
        <PageSection>
          <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-16 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("dt.permission_required")}</p>
          </div>
        </PageSection>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dt.title")} />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("dt.title")} />
        <PageSection><ErrorState title={t("dt.error_title")} description={t("dt.error_body")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const allDeviceTypes = forcedEmpty ? [] : Object.values(deviceTypes);

  const filtered = search
    ? allDeviceTypes.filter((dt) => {
        const q = search.trim().toLowerCase();
        return dt.name_ar.includes(search) || dt.name_en.toLowerCase().includes(q);
      })
    : allDeviceTypes;

  const noResults = forcedNoResults || (allDeviceTypes.length > 0 && filtered.length === 0);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(dt: DeviceType) {
    setEditing(dt);
    setDialogOpen(true);
  }
  function handleSave(input: Parameters<typeof createDeviceType>[0]) {
    if (editing) updateDeviceType(editing.id, input);
    else createDeviceType(input);
    setDialogOpen(false);
    toast.success(t("dt.saved_toast"));
  }

  const columns: Column<DeviceType>[] = [
    {
      key: "name", header: t("dt.col_name"),
      cell: (dt) => {
        const Icon = DEVICE_TYPE_ICONS[dt.icon] ?? Gamepad2;
        return (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{lang === "ar" ? dt.name_ar : dt.name_en}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? dt.name_en : dt.name_ar}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "occupancy", header: t("dt.col_occupancy"),
      cell: (dt) => <Badge variant="outline">{dt.occupancy === "station" ? t("dt.station") : t("dt.ticket")}</Badge>,
    },
    { key: "rate_plan", header: t("dt.col_rate_plan"), cell: (dt) => ratePlanName(dt.rate_plan_id) },
    { key: "service_item", header: t("dt.col_service_item"), cell: (dt) => serviceItemName(dt.service_item_id) },
    {
      key: "play_modes", header: t("dt.col_play_modes"),
      cell: (dt) => (
        dt.play_mode_tags.length === 0
          ? <span className="text-muted-foreground">—</span>
          : (
            <div className="flex gap-1 flex-wrap">
              {dt.play_mode_tags.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">{t(`dt.play_mode_${m}`)}</Badge>
              ))}
            </div>
          )
      ),
    },
    {
      key: "actions", header: t("dt.col_actions"),
      cell: (dt) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <RowActionsContent>
            <RowActionItem icon={Pencil} onClick={() => openEdit(dt)}>{t("dt.edit_btn")}</RowActionItem>
          </RowActionsContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("dt.title")}
        count={allDeviceTypes.length > 0 ? t("dt.count", { n: allDeviceTypes.length }) : undefined}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 me-1.5" />
            {t("dt.new")}
          </Button>
        }
        alert={isOffline ? <OfflineBanner message={t("dt.offline_note")} /> : undefined}
      />

      <PageSection padded={false}>
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("dt.search_placeholder")} className="ps-9" />
          </div>
        </div>

        {allDeviceTypes.length === 0 ? (
          <EmptyState
            icon={Gamepad2}
            title={t("dt.empty_title")}
            description={t("dt.empty_body")}
            action={{ label: t("dt.new"), onClick: openCreate }}
          />
        ) : noResults ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">{t("dt.no_results_title")}</p>
            <p className="text-xs text-muted-foreground">{t("dt.no_results_body")}</p>
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>{t("dt.clear_filters")}</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={filtered} keyExtractor={(dt) => dt.id} />
          </div>
        )}
      </PageSection>

      <DeviceTypeDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSave={handleSave}
      />
    </div>
  );
}
