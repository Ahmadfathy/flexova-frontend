import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Boxes } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

import { formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useWholesaleVanLoads } from "@/stores/wholesaleVanLoads";
import { getReps, getWarehouses } from "@/lib/mock/wholesale";
import type { VanLoadStatus } from "@/types/wholesale";

const STATUS_PILL: Record<VanLoadStatus, PillVariant> = {
  sent: "sent",
  received: "approved",
  dispute: "rejected",
};

export function VanLoadsListPage() {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const loads = useWholesaleVanLoads((s) => s.loads);
  const reps = useMemo(() => getReps(), []);
  const warehouses = useMemo(() => getWarehouses(), []);

  const rows = [...loads].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="h-full overflow-auto p-4">
      <PageHeader title={t("van_loads.title")} count={rows.length} countLabel={t("van_loads.count_label")} />

      {rows.length === 0 ? (
        <EmptyState icon={Boxes} title={t("van_loads.empty")} description="" />
      ) : (
        <div className="rounded border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("van_loads.col_number")}</TableHead>
                <TableHead>{t("van_loads.col_type")}</TableHead>
                <TableHead>{t("van_loads.col_rep")}</TableHead>
                <TableHead>{t("van_loads.col_van")}</TableHead>
                <TableHead>{t("van_loads.col_date")}</TableHead>
                <TableHead>{t("van_loads.col_status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => {
                const rep = reps.find((r) => r.id === l.rep_id);
                const van = warehouses.find((w) => w.type === "van" && (w.id === l.from_warehouse || w.id === l.to_warehouse));
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/wholesale/van-loads/${l.id}`)}>
                    <TableCell><span className="font-mono" dir="ltr">{l.number}</span></TableCell>
                    <TableCell>{t(l.type === "load" ? "van_loads.type_load" : "van_loads.type_return")}</TableCell>
                    <TableCell>{rep ? (lang === "ar" ? rep.name_ar : rep.name_en) : "—"}</TableCell>
                    <TableCell>{van ? (lang === "ar" ? van.name_ar : van.name_en) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(l.date)}</TableCell>
                    <TableCell><StatusPill variant={STATUS_PILL[l.status]} label={t(`van_loads.status_${l.status}`)} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
