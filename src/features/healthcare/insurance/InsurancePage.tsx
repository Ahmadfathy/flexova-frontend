import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ShieldCheck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton } from "@/components/patterns/Skeletons";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useHealthcareInsurance } from "@/stores/healthcareInsurance";
import { useMockState } from "../useMockState";
import { PayerFormModal } from "./PayerFormModal";
import { PlanFormModal } from "./PlanFormModal";
import type { HcPayer, HcPlan } from "@/features/healthcare/types";

/** /healthcare/insurance — Payers & Plans (spec §8), admin. v1 = pricing only, no claims lifecycle. */
export function InsurancePage() {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const can = useCan();

  const payersMap = useHealthcareInsurance((s) => s.payers);
  const plansMap = useHealthcareInsurance((s) => s.plans);
  const toggleContractStatus = useHealthcareInsurance((s) => s.toggleContractStatus);

  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const [payerModalOpen, setPayerModalOpen] = useState(false);
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HcPlan | undefined>(undefined);

  const payers = forcedEmpty ? [] : Object.values(payersMap);
  const selectedPayer = selectedPayerId ? payersMap[selectedPayerId] : payers[0];
  const plans = useMemo(
    () => (selectedPayer ? Object.values(plansMap).filter((p) => p.payer_id === selectedPayer.id) : []),
    [plansMap, selectedPayer]
  );

  function handleOpenNewPlan() {
    setEditingPlan(undefined);
    setPlanModalOpen(true);
  }
  function handleEditPlan(plan: HcPlan) {
    setEditingPlan(plan);
    setPlanModalOpen(true);
  }

  if (!can("healthcare.insurance.manage")) {
    return (
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("insurance.permission_required")}</p>
      </div>
    );
  }

  const payerColumns: Column<HcPayer>[] = [
    { key: "name", header: t("insurance.col_payer_name"), cell: (p) => <span className="font-medium text-foreground">{p.name_ar}</span> },
    {
      key: "status", header: t("insurance.col_contract_status"),
      cell: (p) => (
        <button type="button" onClick={() => toggleContractStatus(p.id)}>
          <StatusPill variant={p.contract_status === "active" ? "approved" : "rejected"} label={t(`insurance.status_${p.contract_status}`)} />
        </button>
      ),
    },
    { key: "covered", header: t("insurance.col_covered_patients"), numeric: true, cell: (p) => p.covered_patients },
    { key: "ar", header: t("insurance.col_ar_on_payer"), numeric: true, cell: (p) => formatMoney(p.ar_on_payer, lang) },
  ];

  const planColumns: Column<HcPlan>[] = [
    { key: "name", header: t("insurance.col_plan_name"), cell: (p) => <span className="font-medium text-foreground">{p.name_ar}</span> },
    { key: "coverage", header: t("insurance.field_coverage_pct"), numeric: true, cell: (p) => `${p.coverage_pct}%` },
    { key: "cap", header: t("insurance.col_cap"), numeric: true, cell: (p) => `${formatMoney(p.cap_amount, lang)} (${t(`insurance.cap_${p.cap_type}`)})` },
    { key: "copay", header: t("insurance.field_copay_value"), numeric: true, cell: (p) => (p.co_pay_type === "fixed" ? formatMoney(p.co_pay_value, lang) : `${p.co_pay_value}%`) },
    { key: "exclusions", header: t("insurance.field_exclusions"), cell: (p) => p.exclusions.join("، ") || "—" },
    {
      key: "actions", header: "",
      cell: (p) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPlan(p)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {isOffline && <OfflineBanner />}

      <PageHeader
        title={t("insurance.title")}
        actions={
          <Button size="sm" onClick={() => setPayerModalOpen(true)}>
            <Plus className="h-4 w-4 me-1.5" /> {t("insurance.new_payer")}
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton cols={4} rows={3} />
      ) : error ? (
        <ErrorState title={t("insurance.error_title")} onRetry={reload} />
      ) : payers.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={t("insurance.empty_title")}
          action={{ label: t("insurance.empty_add"), onClick: () => setPayerModalOpen(true) }}
        />
      ) : (
        <div className="space-y-6">
          <PageSection title={t("insurance.section_payers")} padded={false}>
            <div className="overflow-auto">
              <DataTable
                columns={payerColumns}
                data={payers}
                keyExtractor={(p) => p.id}
              />
            </div>
          </PageSection>

          {payers.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("insurance.plans_for")}</span>
              {payers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPayerId(p.id)}
                  className={`text-xs px-2.5 py-1 rounded border ${selectedPayer?.id === p.id ? "border-brand bg-brand-tint text-brand-text" : "border-border text-muted-foreground"}`}
                >
                  {p.name_ar}
                </button>
              ))}
            </div>
          )}

          {selectedPayer && (
            <PageSection
              title={t("insurance.section_plans", { payer: selectedPayer.name_ar })}
              actions={<Button size="sm" variant="outline" onClick={handleOpenNewPlan}><Plus className="h-3.5 w-3.5 me-1.5" /> {t("insurance.new_plan")}</Button>}
              padded={false}
            >
              {plans.length === 0 ? (
                <EmptyState title={t("insurance.plans_empty")} className="py-10" />
              ) : (
                <div className="overflow-auto">
                  <DataTable columns={planColumns} data={plans} keyExtractor={(p) => p.id} />
                </div>
              )}
            </PageSection>
          )}
        </div>
      )}

      <PayerFormModal open={payerModalOpen} onOpenChange={setPayerModalOpen} />
      {selectedPayer && (
        <PlanFormModal open={planModalOpen} onOpenChange={setPlanModalOpen} payerId={selectedPayer.id} editingPlan={editingPlan} />
      )}
    </div>
  );
}
