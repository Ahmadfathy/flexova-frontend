import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MessageCircle, CalendarPlus, Stethoscope, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth";
import { useHealthcareAudit } from "@/stores/healthcareAudit";
import { useHealthcareClinical } from "@/stores/healthcareClinical";
import { useHealthcarePatients } from "@/stores/healthcarePatients";
import { useHealthcareInsurance } from "@/stores/healthcareInsurance";
import { useMockState } from "../useMockState";
import { ageFromDob } from "@/features/healthcare/calc";
import { patientName } from "@/lib/mock/healthcare";
import { QuickBookDialog } from "../today/QuickBookDialog";
import { StartVisitDialog } from "./360/StartVisitDialog";
import { AnimalSwitcher } from "./360/AnimalSwitcher";
import { VisitsTab } from "./360/VisitsTab";
import { OrdersResultsTab } from "./360/OrdersResultsTab";
import { PrescriptionsTab } from "./360/PrescriptionsTab";
import { InvoicesBalanceTab } from "./360/InvoicesBalanceTab";
import { InsuranceTab } from "./360/InsuranceTab";
import { DataTab } from "./360/DataTab";

type TabKey = "visits" | "orders" | "prescriptions" | "invoices" | "insurance" | "data";

/** /healthcare/patients/:id — Patient 360, the clearest PHI split surface (spec §6). */
export function Patient360Page() {
  const { id = "" } = useParams();
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const can = useCan();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const patients = useHealthcarePatients((s) => s.patients);
  const owners = useHealthcarePatients((s) => s.owners);
  const encountersMap = useHealthcareClinical((s) => s.encounters);
  const orders = useHealthcareClinical((s) => s.orders);
  const results = useHealthcareClinical((s) => s.results);
  const invoicesMap = useHealthcareClinical((s) => s.invoices);
  const payersMap = useHealthcareInsurance((s) => s.payers);
  const plansMap = useHealthcareInsurance((s) => s.plans);
  const logAccess = useHealthcareAudit((s) => s.logAccess);

  const canClinical = can("healthcare.clinical.view");
  const [activeTab, setActiveTab] = useState<TabKey>(canClinical ? "visits" : "invoices");
  const [bookOpen, setBookOpen] = useState(false);
  const [startVisitOpen, setStartVisitOpen] = useState(false);

  const patient = patients[id];

  // Golden rule (spec §0/§6.3) — every profile open is access-logged, admin or
  // clinical, distinguished by surface (mirrors the fixture's own log_2 example
  // of an administrative "patient_admin" read alongside clinical "encounter" reads).
  useEffect(() => {
    if (!patient) return;
    logAccess({
      actor: currentUserId ?? "staff",
      patient_id: patient.id,
      surface: canClinical ? "patient_360" : "patient_admin",
      action: "read",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id, canClinical]);

  const owner = patient ? owners[patient.owner_id] : undefined;

  const patientEncounters = useMemo(() => {
    if (forcedEmpty || !patient) return [];
    return Object.values(encountersMap)
      .filter((e) => e.patient_id === patient.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [encountersMap, patient, forcedEmpty]);

  const patientInvoices = useMemo(() => {
    if (!patient) return [];
    const invoiceIds = new Set(patientEncounters.map((e) => e.invoice_id).filter(Boolean));
    return Object.values(invoicesMap).filter((inv) => inv.patient_id === patient.id || invoiceIds.has(inv.id));
  }, [invoicesMap, patient, patientEncounters]);

  const siblings = useMemo(() => {
    if (!owner || owner.relationship !== "owner") return [];
    return Object.values(patients).filter((p) => p.owner_id === owner.id);
  }, [patients, owner]);

  function handleStartVisit() {
    setStartVisitOpen(true);
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title={t("patients.error_title")} onRetry={reload} />;
  }

  if (!patient) {
    return (
      <div>
        <PageHeader title={t("patient360.title")} />
        <PageSection>
          <p className="text-sm text-muted-foreground text-center py-10">{t("patient360.not_found")}</p>
        </PageSection>
      </div>
    );
  }

  const age = ageFromDob(patient.dob);
  const payer = patient.insurance ? payersMap[patient.insurance.payer_id] : undefined;
  const plan = patient.insurance ? plansMap[patient.insurance.plan_id] : undefined;

  const hasWarnings = patient.allergies.length > 0 || patient.chronic.length > 0 || !!patient.blood_type;

  const tabs = [
    { key: "visits" as const, label: t("patient360.tab_visits"), clinical: true },
    { key: "orders" as const, label: t("patient360.tab_orders"), clinical: true },
    { key: "prescriptions" as const, label: t("patient360.tab_prescriptions"), clinical: true },
    { key: "invoices" as const, label: t("patient360.tab_invoices"), clinical: false },
    { key: "insurance" as const, label: t("patient360.tab_insurance"), clinical: false },
    { key: "data" as const, label: t("patient360.tab_data"), clinical: false },
  ].filter((tb) => canClinical || !tb.clinical);

  return (
    <div>
      {isOffline && <OfflineBanner />}

      <div className="mb-6 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{patientName(patient, lang)}</h1>
              <span className="text-xs font-mono text-muted-foreground" dir="ltr">{patient.code}</span>
              {siblings.length > 1 && <AnimalSwitcher currentId={patient.id} siblings={siblings} lang={lang} />}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {age != null ? t("encounter.age_sex", { age, sex: patient.sex ? t(`sex.${patient.sex}`) : "—" }) : "—"}
              {patient.phone && <> · <span dir="ltr">{patient.phone}</span></>}
              {" · "}
              {patient.insurance
                ? t("encounter.insured_badge", { payer: payer ? (lang === "ar" ? payer.name_ar : payer.name_en) : "" })
                : t("encounter.uninsured_badge")}
            </p>
            {owner && owner.relationship !== "self" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {owner.relationship === "owner" ? t("encounter.rail_owner") : t("encounter.rail_guardian")}: {lang === "ar" ? owner.name_ar : (owner.name_en || owner.name_ar)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button size="sm" variant="outline" onClick={() => toast.success(t("encounter.rx_whatsapp_sent"))}>
              <MessageCircle className="h-3.5 w-3.5 me-1.5" /> {t("patients.action_whatsapp")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBookOpen(true)}>
              <CalendarPlus className="h-3.5 w-3.5 me-1.5" /> {t("patients.action_book")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleStartVisit}>
              <Stethoscope className="h-3.5 w-3.5 me-1.5" /> {t("patient360.action_new_visit")}
            </Button>
            {canClinical && tabs.some((tb) => tb.key === "invoices") && (
              <Button size="sm" variant="outline" onClick={() => setActiveTab("invoices")}>
                <Wallet className="h-3.5 w-3.5 me-1.5" /> {t("patient360.action_view_balance")}
              </Button>
            )}
          </div>
        </div>

        {canClinical && hasWarnings && (
          <div className="rounded-lg bg-warning-tint border border-warning/20 p-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-warning-text">
            {patient.blood_type && <span>{t("patients.field_blood_type")}: {patient.blood_type}</span>}
            {patient.allergies.length > 0 && <span>{t("encounter.rail_allergies")}: {patient.allergies.join("، ")}</span>}
            {patient.chronic.length > 0 && <span>{t("encounter.rail_chronic")}: {patient.chronic.join("، ")}</span>}
          </div>
        )}
      </div>

      <PageSection padded>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList className="mb-4 flex-wrap h-auto">
            {tabs.map((tb) => <TabsTrigger key={tb.key} value={tb.key}>{tb.label}</TabsTrigger>)}
          </TabsList>

          {canClinical && (
            <TabsContent value="visits">
              <VisitsTab encounters={patientEncounters} lang={lang} onStartVisit={handleStartVisit} />
            </TabsContent>
          )}
          {canClinical && (
            <TabsContent value="orders">
              <OrdersResultsTab encounters={patientEncounters} ordersById={orders} resultsById={results} />
            </TabsContent>
          )}
          {canClinical && (
            <TabsContent value="prescriptions">
              <PrescriptionsTab encounters={patientEncounters} ordersById={orders} />
            </TabsContent>
          )}
          <TabsContent value="invoices">
            <InvoicesBalanceTab invoices={patientInvoices} lang={lang} />
          </TabsContent>
          <TabsContent value="insurance">
            <InsuranceTab payer={payer} plan={plan} invoices={patientInvoices} lang={lang} />
          </TabsContent>
          <TabsContent value="data">
            <DataTab patient={patient} owner={owner} lang={lang} canClinical={canClinical} />
          </TabsContent>
        </Tabs>
      </PageSection>

      <QuickBookDialog open={bookOpen} onOpenChange={setBookOpen} defaultPatientId={patient.id} />
      <StartVisitDialog open={startVisitOpen} onOpenChange={setStartVisitOpen} patientId={patient.id} />
    </div>
  );
}
