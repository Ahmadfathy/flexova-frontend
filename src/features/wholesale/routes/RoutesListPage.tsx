import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Route as RouteIcon } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { StatusPill } from "@/components/patterns/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useWholesaleRoutes } from "@/stores/wholesaleRoutes";
import { getReps } from "@/lib/mock/wholesale";
import { WEEKDAY_CODES } from "@/lib/wholesale/routes";

export function DayChips({ days }: { days: string[] }) {
  const { t } = useTranslation("wholesale");
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {WEEKDAY_CODES.filter((code) => days.includes(code)).map((code) => (
        <Badge key={code} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
          {t(`route_editor.day_${code}`)}
        </Badge>
      ))}
    </div>
  );
}

export function RoutesListPage() {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const routes = useWholesaleRoutes((s) => s.routes);
  const reps = useMemo(() => getReps(), []);
  const repMap = useMemo(() => Object.fromEntries(reps.map((r) => [r.id, r])), [reps]);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("routes.title")}
        count={routes.length > 0 ? t("routes.count", { n: routes.length }) : undefined}
        actions={
          can("route.manage") ? (
            <Button size="sm" onClick={() => navigate("/wholesale/routes/new")}>
              <Plus className="h-4 w-4 me-1.5" />
              {t("routes.new")}
            </Button>
          ) : undefined
        }
      />

      <PageSection padded={false}>
        {routes.length === 0 ? (
          <EmptyState
            icon={RouteIcon}
            title={t("routes.no_routes")}
            description={t("routes.empty_sub")}
            action={can("route.manage") ? { label: t("routes.new"), onClick: () => navigate("/wholesale/routes/new") } : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">{t("routes.col_name")}</TableHead>
                <TableHead className="text-xs">{t("routes.col_rep")}</TableHead>
                <TableHead className="text-xs">{t("routes.col_visit_days")}</TableHead>
                <TableHead className="text-xs">{t("routes.col_customers")}</TableHead>
                <TableHead className="text-xs">{t("routes.col_status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => {
                const rep = repMap[route.rep_id];
                return (
                  <TableRow
                    key={route.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                    onClick={() => navigate(`/wholesale/routes/${route.id}`)}
                  >
                    <TableCell className="text-sm font-medium">{lang === "ar" ? route.name_ar : route.name_en}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rep ? (lang === "ar" ? rep.name_ar : rep.name_en) : "—"}</TableCell>
                    <TableCell><DayChips days={route.visit_days} /></TableCell>
                    <TableCell className="tabular-nums text-sm">{route.customers.length}</TableCell>
                    <TableCell>
                      <StatusPill variant={route.status === "active" ? "approved" : "inactive"} label={t("routes.status_active")} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </PageSection>
    </div>
  );
}
