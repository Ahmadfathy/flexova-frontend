import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { StatusPill } from "@/components/patterns/StatusPill";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useHealthcareBoard } from "@/stores/healthcareBoard";
import { useHealthcareAudit } from "@/stores/healthcareAudit";
import { useHealthcareClinical } from "@/stores/healthcareClinical";
import { useHealthcarePatients } from "@/stores/healthcarePatients";
import { useHealthcareInsurance } from "@/stores/healthcareInsurance";
import { useMockState } from "../useMockState";
import { ageFromDob, computeInsuranceSplit } from "@/features/healthcare/calc";
import { patientName } from "@/lib/mock/healthcare";
import { ContextRail } from "./ContextRail";
import { DiagnosisTab } from "./DiagnosisTab";
import { PrescriptionTab } from "./PrescriptionTab";
import { LabsTab } from "./LabsTab";
import { InvoiceTab } from "./InvoiceTab";

type TabKey = "diagnosis" | "prescription" | "labs" | "invoice";

/** /healthcare/encounter/:id — merged clinical screen (spec §4), the module heart. */
export function EncounterPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();

  const { loading, error, isOffline, reload } = useMockState();

  const boardRow = useHealthcareBoard((s) => s.rows[id]);
  const completeVisit = useHealthcareBoard((s) => s.completeVisit);
  const logAccess = useHealthcareAudit((s) => s.logAccess);

  const encounter = useHealthcareClinical((s) => s.encounters[id]);
  const orders = useHealthcareClinical((s) => s.orders);
  const allEncounters = useHealthcareClinical((s) => s.encounters);
  const encounterSync = useHealthcareClinical((s) => s.sync[id]);
  const ensureEncounter = useHealthcareClinical((s) => s.ensureEncounter);
  const updateDiagnosis = useHealthcareClinical((s) => s.updateDiagnosis);
  const addPrescriptionItem = useHealthcareClinical((s) => s.addPrescriptionItem);
  const removePrescriptionItem = useHealthcareClinical((s) => s.removePrescriptionItem);
  const addCatalogOrder = useHealthcareClinical((s) => s.addCatalogOrder);
  const addManualOrder = useHealthcareClinical((s) => s.addManualOrder);
  const removeOrder = useHealthcareClinical((s) => s.removeOrder);
  const invoiceLinesFn = useHealthcareClinical((s) => s.invoiceLines);
  const canFinishFn = useHealthcareClinical((s) => s.canFinish);
  const finishVisit = useHealthcareClinical((s) => s.finishVisit);
  const invoices = useHealthcareClinical((s) => s.invoices);
  const livePatients = useHealthcarePatients((s) => s.patients);
  const owners = useHealthcarePatients((s) => s.owners);
  const payers = useHealthcareInsurance((s) => s.payers);
  const plans = useHealthcareInsurance((s) => s.plans);

  // A "بدء الزيارة" click from Today Board always targets an id that's either an
  // existing encounter or, for a brand-new visit, the appointment_id itself —
  // in the latter case the board row is how we know who the patient/provider are.
  useEffect(() => {
    if (!encounter && boardRow) {
      ensureEncounter(id, { patient_id: boardRow.patient_id, provider_id: boardRow.provider_id, appointment_id: boardRow.appointment_id });
    }
  }, [id, encounter, boardRow, ensureEncounter]);

  const canClinical = can("healthcare.clinical.view");
  const canClinicalEdit = can("healthcare.clinical.edit");
  const [activeTab, setActiveTab] = useState<TabKey>(canClinical ? "diagnosis" : "invoice");

  // Golden rule (spec §0) — every clinical-surface open is access-logged, keyed
  // on the encounter's own id so edits to the same visit don't re-log on every
  // render. Tagged like Patient 360's dual surface (clinical vs administrative-
  // only, e.g. a reception user opening a completed visit just to check the
  // invoice) so the log distinguishes a PHI exposure from a routine admin read.
  useEffect(() => {
    if (!encounter) return;
    logAccess({
      actor: encounter.provider_id, patient_id: encounter.patient_id,
      surface: canClinical ? "encounter" : "encounter_admin", action: "read",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounter?.id, canClinical]);

  const patient = encounter ? livePatients[encounter.patient_id] : undefined;
  // Completed visits are always locked; an open visit is also read-only for
  // anyone without clinical.edit (view-only/observer — clinical.view alone
  // grants reading the tabs, not writing them, per spec §11).
  const readOnly = encounter?.status === "completed" || !canClinicalEdit;

  const priorEncounters = useMemo(() => {
    if (!encounter || !patient) return [];
    return Object.values(allEncounters)
      .filter((e) => e.patient_id === patient.id && e.id !== encounter.id && e.status === "completed")
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allEncounters, encounter, patient]);

  const encounterOrders = useMemo(() => {
    if (!encounter) return [];
    // Derived from the order's own `encounter_id` back-reference, not the
    // encounter's `orders[]` list — the fixture itself has at least one order
    // (ord_7003) whose encounter never got it added to that array, so trusting
    // the array silently drops real orders.
    return Object.values(orders).filter((o) => o.encounter_id === encounter.id);
  }, [encounter, orders]);

  const rxOrder = encounterOrders.find((o) => o.type === "prescription");
  const labOrders = encounterOrders.filter((o) => o.type !== "prescription");

  const lines = encounter ? invoiceLinesFn(encounter.id) : [];
  const total = lines.reduce((sum, l) => sum + l.amount, 0);

  const existingInvoice = encounter?.invoice_id ? invoices[encounter.invoice_id] : undefined;
  const plan = patient?.insurance ? plans[patient.insurance.plan_id] : undefined;
  const preview = computeInsuranceSplit(total, plan);

  const invoiceView = existingInvoice
    ? {
        insured: existingInvoice.insured, patientPortion: existingInvoice.patient_portion,
        insurerPortion: existingInvoice.insurer_portion, splitNote: existingInvoice.split_note, isPreview: false,
      }
    : {
        insured: preview.insured, patientPortion: preview.patient_portion,
        insurerPortion: preview.insurer_portion, splitNote: preview.split_note_ar, isPreview: true,
      };
  const coveragePct = plan?.coverage_pct ?? 0;

  const canFinish = encounter ? canFinishFn(encounter.id) : false;

  function handleFinish() {
    if (!encounter) return;
    const result = finishVisit(encounter.id);
    if (!result.ok) return;
    completeVisit(encounter.appointment_id, result.invoice);
    toast.success(t("encounter.finish_success"));
    navigate("/healthcare/today");
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ErrorState title={t("encounter.error_title")} description={t("encounter.error_body")} onRetry={reload} />
        <p className="text-center text-xs text-muted-foreground mt-2">{t("encounter.error_draft_note")}</p>
      </div>
    );
  }

  if (!encounter || !patient) {
    return (
      <div>
        <PageHeader title={t("encounter.title")} />
        <PageSection>
          <p className="text-sm text-muted-foreground text-center py-10">{t("encounter.not_found")}</p>
        </PageSection>
      </div>
    );
  }

  const payer = patient.insurance ? payers[patient.insurance.payer_id] : undefined;
  const age = ageFromDob(patient.dob);

  const tabs = [
    { key: "diagnosis" as const, label: t("encounter.tab_diagnosis"), clinical: true },
    { key: "prescription" as const, label: t("encounter.tab_prescription"), clinical: true },
    { key: "labs" as const, label: t("encounter.tab_labs"), clinical: true },
    { key: "invoice" as const, label: t("encounter.tab_invoice"), clinical: false },
  ].filter((tb) => canClinical || !tb.clinical);

  return (
    <div>
      {isOffline && <OfflineBanner message={t("encounter.offline_note")} />}

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-foreground">{patientName(patient, lang)}</h1>
            {readOnly && <StatusPill variant="approved" label={t("status.completed")} />}
            {encounterSync && encounterSync !== "synced" && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                encounterSync === "local" ? "bg-warning-tint text-warning-text" : "bg-brand-tint text-brand-text"
              )}>
                {encounterSync === "local" ? t("today.sync_local") : t("today.sync_syncing")}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {age != null ? t("encounter.age_sex", { age, sex: patient.sex ? t(`sex.${patient.sex}`) : "—" }) : "—"}
            {" · "}
            {patient.insurance
              ? t("encounter.insured_badge", { payer: payer ? (lang === "ar" ? payer.name_ar : payer.name_en) : "" })
              : t("encounter.uninsured_badge")}
          </p>
        </div>
        {!readOnly && (
          <Button onClick={handleFinish} disabled={!canFinish} className="shrink-0">
            <CheckCircle2 className="h-4 w-4 me-1.5" /> {t("encounter.finish_visit")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <PageSection padded>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
            <TabsList className="mb-4">
              {tabs.map((tb) => (
                <TabsTrigger key={tb.key} value={tb.key}>{tb.label}</TabsTrigger>
              ))}
            </TabsList>

            {canClinical && (
              <TabsContent value="diagnosis">
                <DiagnosisTab encounter={encounter} readOnly={readOnly} onChange={(patch) => updateDiagnosis(encounter.id, patch)} />
              </TabsContent>
            )}
            {canClinical && (
              <TabsContent value="prescription">
                <PrescriptionTab
                  rxOrder={rxOrder}
                  readOnly={readOnly}
                  onAdd={(item) => addPrescriptionItem(encounter.id, item)}
                  onRemove={(index) => removePrescriptionItem(encounter.id, index)}
                />
              </TabsContent>
            )}
            {canClinical && (
              <TabsContent value="labs">
                <LabsTab
                  orders={labOrders}
                  lang={lang}
                  readOnly={readOnly}
                  onAddCatalog={(catalogId) => addCatalogOrder(encounter.id, catalogId)}
                  onAddManual={(input) => addManualOrder(encounter.id, input)}
                  onRemove={(orderId) => removeOrder(encounter.id, orderId)}
                />
              </TabsContent>
            )}
            <TabsContent value="invoice">
              <InvoiceTab
                lines={lines}
                total={total}
                lang={lang}
                insured={invoiceView.insured}
                coveragePct={coveragePct}
                patientPortion={invoiceView.patientPortion}
                insurerPortion={invoiceView.insurerPortion}
                splitNote={invoiceView.splitNote}
                isPreview={invoiceView.isPreview}
              />
            </TabsContent>
          </Tabs>
        </PageSection>

        {canClinical && (
          <ContextRail patient={patient} owner={owners[patient.owner_id]} lang={lang} priorEncounters={priorEncounters} />
        )}
      </div>
    </div>
  );
}
