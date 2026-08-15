import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { Plus, FileX2 } from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { useCan } from "@/lib/permissions";
import { useCreateDispatcher } from "@/stores/createDispatcher";
import {
  useSalesData,
  type CreditNote,
  type EtaStatus,
} from "@/features/sales/invoices/useSalesData";
import { CreditNoteCreateDrawer } from "./CreditNoteCreateDrawer";

function etaPillVariant(s: EtaStatus): PillVariant {
  if (s === "valid")   return "approved";
  if (s === "clearing") return "active";
  if (s === "queued")  return "pending";
  if (s === "rejected" || s === "buyer_rejected") return "rejected";
  if (s === "cancelled") return "inactive";
  return "default";
}

// ── Main page ─────────────────────────────────────────────────────

export function CreditNotesPage() {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const can = useCan();
  const canCreate = can("return");
  const openCreate = useCreateDispatcher(s => s.openCreate);
  const [searchParams] = useSearchParams();
  const preSource = searchParams.get("source") ?? "";

  const [sourceSheetOpen, setSourceSheetOpen] = useState(!!preSource);
  const { data, loading, error, isOffline, reload } = useSalesData();

  if (loading) return (
    <div className="space-y-4 py-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (error) return <ErrorState description={error} onRetry={reload} />;

  const creditNotes: CreditNote[] = data?.creditNotes ?? [];
  const customers   = data?.customers ?? [];

  function customerName(id: string) {
    const c = customers.find(c => c.id === id);
    return lang === "ar" ? c?.name_ar : c?.name_en;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("credit.title")}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => openCreate("new_credit_note")}>
              <Plus className="size-4 me-1.5" />
              {t("credit.new")}
            </Button>
          )
        }
        alert={isOffline ? <OfflineBanner /> : undefined}
      />

      <PageSection padded={false}>
        {creditNotes.length === 0 ? (
          <EmptyState
            icon={FileX2}
            title={t("credit.no_notes")}
            action={canCreate ? { label: t("credit.new"), onClick: () => openCreate("new_credit_note") } : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t("credit.col_number")}</TableHead>
                <TableHead className="text-start">{t("credit.col_date")}</TableHead>
                <TableHead className="text-start">{t("credit.col_source")}</TableHead>
                <TableHead className="text-start">{t("credit.col_customer")}</TableHead>
                <TableHead className="text-start">{t("credit.col_value")}</TableHead>
                <TableHead className="text-start">{t("credit.col_eta")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditNotes.map(cn => (
                <TableRow key={cn.id} className="group">
                  <TableCell className="font-mono text-sm">{cn.number}</TableCell>
                  <TableCell className="text-sm">{formatDate(cn.date)}</TableCell>
                  <TableCell className="text-sm">
                    <Link
                      to={`/sales/invoices/${cn.source_invoice}`}
                      className="text-primary hover:underline font-mono text-xs"
                    >
                      {cn.source_invoice}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{customerName(cn.customer_id)}</TableCell>
                  <TableCell className="text-start tabular-nums text-sm font-medium">
                    {formatMoney(cn.totals.value, lang)}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      variant={etaPillVariant(cn.eta_status)}
                      label={t(`eta.${cn.eta_status}`)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageSection>

      {preSource && (
        <CreditNoteCreateDrawer
          open={sourceSheetOpen}
          onOpenChange={setSourceSheetOpen}
          defaultSourceId={preSource}
        />
      )}
    </div>
  );
}
