import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Plus, Users } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton } from "@/components/patterns/Skeletons";
import { StatusPill } from "@/components/patterns/StatusPill";
import { ModalShell } from "@/components/patterns/ModalShell";
import { FormField, FormActions } from "@/components/patterns/FormLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useConstructionStore } from "@/stores/constructionStore";
import { useMockState } from "@/features/projects/useMockState";

export function SubcontractsListPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("construction");
  const { lang } = useAppearance();
  const can = useCan();

  const subcontractsAll = useConstructionStore((s) => s.subcontracts);
  const boqItemsAll = useConstructionStore((s) => s.boq_items);
  const addSubcontract = useConstructionStore((s) => s.addSubcontract);
  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const canManage = can("construction.subcontract.manage");

  const [modalOpen, setModalOpen] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [linkedItem, setLinkedItem] = useState("");
  const [attempted, setAttempted] = useState(false);

  const rows = useMemo(
    () => (forcedEmpty ? [] : Object.values(subcontractsAll).sort((a, b) => a.subcontractor_name_ar.localeCompare(b.subcontractor_name_ar))),
    [subcontractsAll, forcedEmpty]
  );

  function openModal() {
    setNameAr("");
    setLinkedItem("");
    setAttempted(false);
    setModalOpen(true);
  }

  function handleSave() {
    setAttempted(true);
    if (!nameAr.trim() || !linkedItem) return;
    const result = addSubcontract(id, { subcontractor_name_ar: nameAr.trim(), linked_boq_item: linkedItem });
    if (result.ok) {
      setModalOpen(false);
      navigate(`/projects/${id}/subcontracts/${result.id}`);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("sub.title")} />
        <TableSkeleton rows={4} cols={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("sub.title")} />
        <PageSection><ErrorState onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("sub.title")}
        actions={canManage ? (
          <Button size="sm" onClick={openModal}>
            <Plus className="h-4 w-4 me-1.5" />{t("sub.new_subcontractor")}
          </Button>
        ) : undefined}
      />

      {isOffline && <OfflineBanner />}

      {rows.length === 0 ? (
        <PageSection>
          <EmptyState
            icon={Users}
            title={t("sub.empty_title")}
            action={canManage ? { label: t("sub.new_subcontractor"), onClick: openModal } : undefined}
          />
        </PageSection>
      ) : (
        <PageSection padded={false}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">{t("sub.col_subcontractor")}</TableHead>
                  <TableHead className="text-xs text-end">{t("sub.col_contract_value")}</TableHead>
                  <TableHead className="text-xs text-end">{t("sub.col_paid")}</TableHead>
                  <TableHead className="text-xs text-end">{t("sub.col_retained")}</TableHead>
                  <TableHead className="text-xs text-end">{t("sub.col_outstanding")}</TableHead>
                  <TableHead className="text-xs">{t("sub.col_status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((sc) => {
                  const linkedMain = boqItemsAll[sc.linked_boq_item];
                  const isLoss = linkedMain && sc.sub_contract_value > linkedMain.value;
                  const paid = sc.sub_claims
                    .filter((c) => c.status === "approved" || c.status === "invoiced" || c.status === "collected")
                    .reduce((sum, c) => sum + c.net_payable, 0);
                  return (
                    <TableRow
                      key={sc.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                      onClick={() => navigate(`/projects/${id}/subcontracts/${sc.id}`)}
                    >
                      <TableCell className="px-3 py-2.5 text-sm font-medium">
                        <div className="flex items-center gap-1.5">
                          {sc.subcontractor_name_ar}
                          {isLoss && (
                            <span title={t("sub.loss_warn")}>
                              <AlertTriangle className="h-4 w-4 text-danger-text shrink-0" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-end">{formatMoney(sc.sub_contract_value, lang)}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-end">{formatMoney(paid, lang)}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-end">{formatMoney(sc.sub_retention.accumulated_retained, lang)}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-end">{formatMoney(sc.sub_retention.outstanding, lang)}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        <StatusPill variant={sc.status === "in_progress" ? "active" : "inactive"} label={t(`sub.status_${sc.status}`)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </PageSection>
      )}

      <ModalShell
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={t("sub.new_subcontractor")}
        size="md"
        footer={<FormActions onCancel={() => setModalOpen(false)} onSave={handleSave} />}
      >
        <div className="space-y-4">
          <FormField label={t("sub.subcontractor_name")} htmlFor="sub-name" required error={attempted && !nameAr.trim() ? t("sub.subcontractor_name") : undefined}>
            <Input id="sub-name" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          </FormField>
          <FormField label={t("sub.linked_item")} htmlFor="sub-linked" required error={attempted && !linkedItem ? t("sub.linked_item_placeholder") : undefined}>
            <Select value={linkedItem} onValueChange={setLinkedItem}>
              <SelectTrigger id="sub-linked"><SelectValue placeholder={t("sub.linked_item_placeholder")} /></SelectTrigger>
              <SelectContent>
                {Object.values(boqItemsAll).map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.code} — {item.description_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </ModalShell>
    </div>
  );
}
