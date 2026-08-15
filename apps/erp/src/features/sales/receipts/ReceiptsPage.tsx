import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { Plus, Wallet, Search } from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { useCan } from "@/lib/permissions";
import { useCreateDispatcher } from "@/stores/createDispatcher";
import {
  useSalesData,
  type Receipt,
} from "@/features/sales/invoices/useSalesData";

// ── Main page ─────────────────────────────────────────────────────

export function ReceiptsPage() {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const can = useCan();
  const canCreate = can("collect");
  const openCreate = useCreateDispatcher(s => s.openCreate);

  const [search, setSearch] = useState("");

  const { data, loading, error, isOffline, reload } = useSalesData();

  const receipts: Receipt[] = data?.receipts  ?? [];
  const customers = data?.customers  ?? [];
  const invoices  = data?.invoices   ?? [];
  const payMethods  = data?.paymentMethods ?? [];
  const treasuries  = data?.treasuries ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return receipts;
    return receipts.filter(r => {
      const cust = customers.find(c => c.id === r.customer_id);
      const name = lang === "ar" ? cust?.name_ar : cust?.name_en;
      return r.number.toLowerCase().includes(q) || name?.toLowerCase().includes(q);
    });
  }, [receipts, search, customers, lang]);

  if (loading) return (
    <div className="space-y-4 py-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (error) return <ErrorState description={error} onRetry={reload} />;

  function customerName(id: string) {
    const c = customers.find(c => c.id === id);
    return lang === "ar" ? c?.name_ar : c?.name_en;
  }

  function invoiceNumber(id: string) {
    return invoices.find(inv => inv.id === id)?.number ?? id;
  }

  function methodName(id: string) {
    const m = payMethods.find(m => m.id === id);
    return lang === "ar" ? m?.name_ar : m?.name_en;
  }

  function treasuryName(id: string) {
    const tr = treasuries.find(tr => tr.id === id);
    return lang === "ar" ? tr?.name_ar : tr?.name_en;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("receipt.title")}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => openCreate("new_receipt")}>
              <Plus className="size-4 me-1.5" />
              {t("receipt.new")}
            </Button>
          )
        }
        alert={isOffline ? <OfflineBanner /> : undefined}
      />

      <PageSection padded={false}>

        {/* Toolbar — search; lives inside the card, above the table */}
        <div className="px-6 py-6 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("receipt.search_placeholder")}
              className="ps-9"
            />
          </div>
        </div>

        {receipts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={t("receipt.no_receipts")}
            action={canCreate ? { label: t("receipt.new"), onClick: () => openCreate("new_receipt") } : undefined}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={t("list.no_results")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t("receipt.col_number")}</TableHead>
                <TableHead className="text-start">{t("receipt.col_date")}</TableHead>
                <TableHead className="text-start">{t("receipt.col_customer")}</TableHead>
                <TableHead className="text-start">{t("receipt.col_invoice")}</TableHead>
                <TableHead className="text-start">{t("receipt.col_amount")}</TableHead>
                <TableHead className="text-start">{t("receipt.col_method")}</TableHead>
                <TableHead className="text-start">{t("receipt.col_treasury")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(rcv => (
                <TableRow key={rcv.id}>
                  <TableCell className="font-mono text-sm">{rcv.number}</TableCell>
                  <TableCell className="text-sm">{formatDate(rcv.date)}</TableCell>
                  <TableCell className="text-sm">{customerName(rcv.customer_id)}</TableCell>
                  <TableCell className="text-sm">
                    <span className="font-mono text-xs">
                      {invoiceNumber(rcv.invoice_id)}
                    </span>
                  </TableCell>
                  <TableCell className="text-start tabular-nums text-sm font-semibold">
                    {formatMoney(rcv.amount, lang)}
                  </TableCell>
                  <TableCell className="text-sm">{methodName(rcv.method)}</TableCell>
                  <TableCell className="text-sm">{treasuryName(rcv.treasury_id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageSection>
    </div>
  );
}
