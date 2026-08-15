import { useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, Sparkles, Route as RouteIcon } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { RouteBuilder } from "@/components/wholesale/RouteBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useWholesaleRoutes } from "@/stores/wholesaleRoutes";
import { useWholesaleVisits } from "@/stores/wholesaleVisits";
import { useWholesaleCustomers } from "@/stores/wholesaleCustomers";
import { getReps } from "@/lib/mock/wholesale";
import { WEEKDAY_CODES, generateDayPlan } from "@/lib/wholesale/routes";
import type { Route } from "@/types/wholesale";
import branchesFixture from "@/lib/mock/fixtures/permissions.fixtures.json";

interface Branch { id: string; name_ar: string; name_en: string; }
const BRANCHES = branchesFixture.branches as Branch[];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RouteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();

  const routes = useWholesaleRoutes((s) => s.routes);
  const addRoute = useWholesaleRoutes((s) => s.addRoute);
  const updateRoute = useWholesaleRoutes((s) => s.updateRoute);
  const visits = useWholesaleVisits((s) => s.visits);
  const addVisits = useWholesaleVisits((s) => s.addVisits);
  const customers = useWholesaleCustomers((s) => s.customers);
  const reps = useMemo(() => getReps(), []);

  const existingRoute = !isNew ? routes.find((r) => r.id === id) : undefined;

  const newIdRef = useRef(crypto.randomUUID());
  const routeId = existingRoute?.id ?? newIdRef.current;
  const [isPersisted, setIsPersisted] = useState(!!existingRoute);

  const [nameAr, setNameAr] = useState(existingRoute?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(existingRoute?.name_en ?? "");
  const [repId, setRepId] = useState(existingRoute?.rep_id ?? "");
  const [branchId, setBranchId] = useState(existingRoute?.branch_id ?? "br_main");
  const [visitDays, setVisitDays] = useState<string[]>(existingRoute?.visit_days ?? []);
  const [customerIds, setCustomerIds] = useState<string[]>(
    existingRoute ? [...existingRoute.customers].sort((a, b) => a.sequence - b.sequence).map((c) => c.customer_id) : [],
  );
  const [genDate, setGenDate] = useState(todayStr());

  if (!isNew && !existingRoute) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("route_editor.title_edit")} />
        <EmptyState
          icon={RouteIcon}
          title={t("route_editor.not_found")}
          description=""
          action={{ label: t("route_editor.back_to_list"), onClick: () => navigate("/wholesale/routes") }}
        />
      </div>
    );
  }

  function toggleDay(code: string) {
    setVisitDays((prev) => (prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]));
  }

  function buildRouteObject(): Route {
    return {
      id: routeId,
      name_ar: nameAr,
      name_en: nameEn,
      rep_id: repId,
      branch_id: branchId,
      visit_days: visitDays,
      status: existingRoute?.status ?? "active",
      customers: customerIds.map((cid, idx) => ({ customer_id: cid, sequence: idx + 1 })),
    };
  }

  function saveRoute() {
    if (!nameAr.trim()) {
      toast.error(t("route_editor.error_name_required"));
      return;
    }
    if (!repId) {
      toast.error(t("route_editor.error_rep_required"));
      return;
    }
    const obj = buildRouteObject();
    if (isPersisted) {
      updateRoute(routeId, obj);
    } else {
      addRoute(obj);
      setIsPersisted(true);
    }
    toast.success(t("route_editor.saved_toast"));
    navigate(`/wholesale/routes/${routeId}`, { replace: true });
  }

  function handleGeneratePlan() {
    if (!isPersisted) {
      toast.error(t("route_editor.error_name_required"));
      return;
    }
    const route = buildRouteObject();
    const result = generateDayPlan(route, genDate, visits);
    if (!result.ok) {
      toast.error(
        result.reason === "already_exists"
          ? t("route_editor.generate_already_exists", { date: formatDate(genDate) })
          : t("route_editor.generate_wrong_weekday", { date: formatDate(genDate) }),
      );
      return;
    }
    addVisits(result.created);
    toast.success(t("route_editor.generate_success", { n: result.created.length, date: formatDate(genDate) }));
  }

  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={existingRoute ? (lang === "ar" ? existingRoute.name_ar : existingRoute.name_en) : t("route_editor.title_new")}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate("/wholesale/routes")}>
            <BackIcon className="h-4 w-4 me-1" />
            {t("route_editor.back_to_list")}
          </Button>
        }
      />

      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("route_editor.field_name")} *</label>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="عربي" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">&nbsp;</label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="English" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("route_editor.field_rep")} *</label>
            <Select value={repId} onValueChange={setRepId}>
              <SelectTrigger><SelectValue placeholder={t("route_editor.select_rep")} /></SelectTrigger>
              <SelectContent>
                {reps.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{lang === "ar" ? r.name_ar : r.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("route_editor.field_branch")}</label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder={t("route_editor.select_branch")} /></SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{lang === "ar" ? b.name_ar : b.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-medium text-muted-foreground">{t("route_editor.field_visit_days")}</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {WEEKDAY_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleDay(code)}
                  className={cn(
                    "h-8 px-2.5 rounded text-xs font-medium border transition-colors",
                    visitDays.includes(code)
                      ? "bg-brand-tint text-brand-text border-brand/40"
                      : "bg-card text-muted-foreground border-border hover:bg-muted/40",
                  )}
                >
                  {t(`route_editor.day_${code}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <RouteBuilder customerIds={customerIds} allCustomers={customers} lang={lang} onChange={setCustomerIds} />
      </PageSection>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={saveRoute}>
          <Save className="h-4 w-4 me-1.5" />
          {t("route_editor.save")}
        </Button>
      </div>

      <PageSection title={t("route_editor.generate_plan")}>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={genDate} onChange={(e) => setGenDate(e.target.value)} className="w-auto" />
          <Button onClick={handleGeneratePlan}>
            <Sparkles className="h-4 w-4 me-1.5" />
            {t("route_editor.generate_plan")}
          </Button>
        </div>
      </PageSection>
    </div>
  );
}
