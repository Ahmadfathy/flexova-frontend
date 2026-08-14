import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus, Download, Users, MessageCircle, CalendarPlus, UserSquare2, MoreVertical, PawPrint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { DataTable, type Column, RowActionsContent, RowActionItem } from "@/components/patterns/DataTable";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton } from "@/components/patterns/Skeletons";
import { formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useHealthcarePatients } from "@/stores/healthcarePatients";
import { useHealthcareInsurance } from "@/stores/healthcareInsurance";
import { patientName } from "@/lib/mock/healthcare";
import { useMockState } from "../useMockState";
import { QuickBookDialog } from "../today/QuickBookDialog";
import { PatientQuickAddDialog } from "./PatientQuickAddDialog";
import { VeterinaryAddDialog } from "./VeterinaryAddDialog";
import type { HcPatient } from "@/features/healthcare/types";

type InsuranceFilter = "all" | "insured" | "uninsured";
type StatusFilter = "all" | "active" | "inactive";

/** /healthcare/patients — Patients list (spec §5.1). */
export function PatientsListPage() {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();

  const patientsMap = useHealthcarePatients((s) => s.patients);
  const payersMap = useHealthcareInsurance((s) => s.payers);
  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const [search, setSearch] = useState("");
  const [insuranceFilter, setInsuranceFilter] = useState<InsuranceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [vetAddOpen, setVetAddOpen] = useState(false);
  const [bookPatientId, setBookPatientId] = useState<string | null>(null);

  const forcedNoResults = useMemo(
    () => new URLSearchParams(window.location.search).get("mock") === "no_results",
    []
  );

  const allPatients = forcedEmpty ? [] : Object.values(patientsMap);

  const filtered = useMemo(() => {
    let list = allPatients;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.name_ar.toLowerCase().includes(q) ||
        p.name_en.toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q) ||
        p.code.toLowerCase().includes(q)
      );
    }
    if (insuranceFilter !== "all") {
      list = list.filter((p) => (insuranceFilter === "insured" ? !!p.insurance : !p.insurance));
    }
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    return list;
  }, [allPatients, search, insuranceFilter, statusFilter]);

  const noResults = forcedNoResults || (allPatients.length > 0 && filtered.length === 0);

  function clearFilters() {
    setSearch(""); setInsuranceFilter("all"); setStatusFilter("all");
  }

  function ageSexLabel(p: HcPatient): string {
    if (!p.dob && !p.sex) return "—";
    const dob = p.dob ? new Date(p.dob) : null;
    const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000)) : null;
    const sexLabel = p.sex ? t(`sex.${p.sex}`) : "";
    return [age != null ? `${age}` : null, sexLabel || null].filter(Boolean).join(" · ") || "—";
  }

  const columns: Column<HcPatient>[] = [
    { key: "code", header: t("patients.col_code"), cell: (p) => <span className="font-mono text-xs" dir="ltr">{p.code}</span> },
    {
      key: "name", header: t("patients.col_name"),
      cell: (p) => (
        <button
          type="button"
          onClick={() => navigate(`/healthcare/patients/${p.id}`)}
          className="font-medium text-foreground hover:text-brand-text hover:underline text-start"
        >
          {patientName(p, lang)}
        </button>
      ),
    },
    { key: "age_sex", header: t("patients.col_age_sex"), cell: (p) => ageSexLabel(p) },
    { key: "phone", header: t("patients.col_phone"), cell: (p) => (p.phone ? <span dir="ltr">{p.phone}</span> : "—") },
    {
      key: "insurance", header: t("patients.col_insurance"),
      cell: (p) => {
        if (!p.insurance) return <StatusPill variant="inactive" label={t("encounter.uninsured_badge")} />;
        const payer = payersMap[p.insurance.payer_id];
        return <StatusPill variant="active" label={payer ? payer.name_ar : t("patients.col_insurance")} />;
      },
    },
    {
      key: "last_visit", header: t("patients.col_last_visit"),
      cell: (p) => (p.last_visit ? formatDate(p.last_visit) : "—"),
    },
    {
      key: "actions", header: "",
      cell: (p) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <RowActionsContent>
              <RowActionItem icon={UserSquare2} onClick={() => navigate(`/healthcare/patients/${p.id}`)}>
                {t("patients.action_open_profile")}
              </RowActionItem>
              <RowActionItem icon={CalendarPlus} onClick={() => setBookPatientId(p.id)}>
                {t("patients.action_book")}
              </RowActionItem>
              <RowActionItem icon={MessageCircle} onClick={() => toast.success(t("encounter.rx_whatsapp_sent"))}>
                {t("patients.action_whatsapp")}
              </RowActionItem>
            </RowActionsContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (!can("healthcare.patients.view")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("patients.permission_required")}</p>
      </div>
    );
  }

  return (
    <div>
      {isOffline && <OfflineBanner />}

      <PageHeader
        title={t("patients.title")}
        count={allPatients.length}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 me-1.5" /> {t("patients.export")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setVetAddOpen(true)}>
              <PawPrint className="h-4 w-4 me-1.5" /> {t("patients.new_vet")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setQuickAddOpen(true)}>
              <Plus className="h-4 w-4 me-1.5" /> {t("patients.quickadd_title")}
            </Button>
            <Button size="sm" onClick={() => navigate("/healthcare/patients/new")}>
              <Plus className="h-4 w-4 me-1.5" /> {t("patients.new")}
            </Button>
          </div>
        }
      />

      <PageSection padded={false}>
        <div className="px-6 py-4 border-b border-border flex flex-wrap gap-2 items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("patients.search_placeholder")}
            className="h-9 max-w-xs"
          />
          <Select value={insuranceFilter} onValueChange={(v) => setInsuranceFilter(v as InsuranceFilter)}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("patients.filter_all")}</SelectItem>
              <SelectItem value="insured">{t("patients.filter_insured")}</SelectItem>
              <SelectItem value="uninsured">{t("patients.filter_uninsured")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("patients.filter_all")}</SelectItem>
              <SelectItem value="active">{t("patients.filter_active")}</SelectItem>
              <SelectItem value="inactive">{t("patients.filter_inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="p-4"><TableSkeleton cols={7} rows={6} /></div>
        ) : error ? (
          <ErrorState title={t("patients.error_title")} onRetry={reload} />
        ) : allPatients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("patients.empty_title")}
            action={{ label: t("patients.empty_add"), onClick: () => navigate("/healthcare/patients/new") }}
          />
        ) : noResults ? (
          <EmptyState
            title={t("today.no_results_title")}
            description={t("today.no_results_body")}
            action={{ label: t("today.clear_filters"), onClick: clearFilters }}
          />
        ) : (
          <div className="overflow-auto">
            <DataTable columns={columns} data={filtered} keyExtractor={(p) => p.id} />
          </div>
        )}
      </PageSection>

      <PatientQuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <VeterinaryAddDialog open={vetAddOpen} onOpenChange={setVetAddOpen} />
      <QuickBookDialog
        open={bookPatientId !== null}
        onOpenChange={(o) => { if (!o) setBookPatientId(null); }}
        defaultPatientId={bookPatientId ?? undefined}
      />
    </div>
  );
}
