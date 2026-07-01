import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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

import { Plus, FilePlus2 } from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { useCan } from "@/lib/permissions";
import { useCreateDispatcher } from "@/stores/createDispatcher";
import {
  useSalesData,
  type DebitNote,
  type EtaStatus,
} from "@/features/sales/invoices/useSalesData";

function etaPillVariant(s: EtaStatus): PillVariant {
  if (s === "valid")    return "approved";
  if (s === "clearing") return "active";
  if (s === "queued")   return "pending";
  if (s === "rejected" || s === "buyer_rejected") return "rejected";
  if (s === "cancelled") return "inactive";
  return "default";
}

// ── Main page ─────────────────────────────────────────────────────

export function DebitNotesPage() {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const can = useCan();
  const canCreate = can("return");
  const openCreate = useCreateDispatcher(s => s.openCreate);

  const { data, loading, error, isOffline, reload } = useSalesData();

  if (loading) return (
    <div className="space-y-4 py-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (error) return <ErrorState description={error} onRetry={reload} />;

  const debitNotes: DebitNote[] = data?.debitNotes ?? [];
  const customers = data?.customers ?? [];

  function customerName(id: string) {
    const c = customers.find(c => c.id === id);
    return lang === "ar" ? c?.name_ar : c?.name_en;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("debit.title")}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => openCreate("new_debit_note")}>
              <Plus className="size-4 me-1.5" />
              {t("debit.new")}
            </Button>
          )
        }
        alert={isOffline ? <OfflineBanner /> : undefined}
      />

      <PageSection padded={false}>
        {debitNotes.length === 0 ? (
          <EmptyState
            icon={FilePlus2}
            title={t("debit.no_notes")}
            action={canCreate ? { label: t("debit.new"), onClick: () => openCreate("new_debit_note") } : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t("debit.col_number")}</TableHead>
                <TableHead className="text-start">{t("debit.col_date")}</TableHead>
                <TableHead className="text-start">{t("debit.col_source")}</TableHead>
                <TableHead className="text-start">{t("debit.col_customer")}</TableHead>
                <TableHead className="text-start">{t("debit.col_value")}</TableHead>
                <TableHead className="text-start">{t("debit.col_eta")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debitNotes.map(dn => (
                <TableRow key={dn.id}>
                  <TableCell className="font-mono text-sm">{dn.number}</TableCell>
                  <TableCell className="text-sm">{formatDate(dn.date)}</TableCell>
                  <TableCell className="text-sm">
                    <Link
                      to={`/sales/invoices/${dn.source_invoice}`}
                      className="text-primary hover:underline font-mono text-xs"
                    >
                      {dn.source_invoice}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{customerName(dn.customer_id)}</TableCell>
                  <TableCell className="text-start tabular-nums text-sm font-medium">
                    {formatMoney(dn.totals.value, lang)}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      variant={etaPillVariant(dn.eta_status)}
                      label={t(`eta.${dn.eta_status}`)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageSection>
    </div>
  );
}
