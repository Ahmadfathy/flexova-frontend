import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, Search, FileQuestion, MoreVertical, Eye, ArrowRightLeft, Copy } from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { useCan } from "@/lib/permissions";
import {
  useSalesData,
  type QuotationStatus,
} from "@/features/sales/invoices/useSalesData";

function quotePillVariant(s: QuotationStatus): PillVariant {
  if (s === "accepted") return "approved";
  if (s === "sent")     return "active";
  if (s === "draft")    return "default";
  if (s === "rejected") return "rejected";
  if (s === "expired")  return "inactive";
  return "default";
}

export function QuotationsPage() {
  const { t, i18n } = useTranslation("sales");
  const lang    = i18n.language as "ar" | "en";
  const nav     = useNavigate();
  const can        = useCan();
  const canCreate  = can("quote");
  const canConvert = can("invoice");

  const [search,    setSearch]    = useState("");
  const [statusFil, setStatusFil] = useState("all");

  const { data, loading, error, isOffline, reload } = useSalesData();

  const customers  = data?.customers  ?? [];
  const quotations = data?.quotations ?? [];

  function customerName(id: string) {
    const c = customers.find(c => c.id === id);
    return lang === "ar" ? c?.name_ar : c?.name_en;
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return quotations.filter(qt => {
      if (statusFil !== "all" && qt.status !== statusFil) return false;
      if (q) {
        const cust = customers.find(c => c.id === qt.customer_id);
        const custName = lang === "ar" ? cust?.name_ar : cust?.name_en;
        if (
          !qt.number.toLowerCase().includes(q) &&
          !custName?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [quotations, search, statusFil, customers, lang]);

  const statuses: QuotationStatus[] = ["draft", "sent", "accepted", "rejected", "expired"];

  if (loading) return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (error) return <ErrorState description={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      {isOffline && <OfflineBanner />}

      <PageHeader
        title={t("quote.title")}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => nav("/sales/quotations/new")}>
              <Plus className="size-4 me-1.5" />
              {t("quote.new")}
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("quote.search_placeholder")}
            className="ps-9"
          />
        </div>
        <Select value={statusFil} onValueChange={setStatusFil}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("quote.all_statuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("quote.all_statuses")}</SelectItem>
            {statuses.map(s => (
              <SelectItem key={s} value={s}>
                {t(`quote.status_${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PageSection padded={false}>
        {quotations.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title={t("quote.no_quotes")}
            action={canCreate ? { label: t("quote.new"), onClick: () => nav("/sales/quotations/new") } : undefined}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={t("quote.no_results")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t("quote.col_number")}</TableHead>
                <TableHead className="text-start">{t("quote.col_date")}</TableHead>
                <TableHead className="text-start">{t("quote.col_customer")}</TableHead>
                <TableHead className="text-end">{t("quote.col_total")}</TableHead>
                <TableHead className="text-start">{t("quote.col_status")}</TableHead>
                <TableHead className="text-start">{t("quote.col_valid_until")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(qt => (
                <TableRow
                  key={qt.id}
                  className="cursor-pointer"
                  onClick={() => nav(`/sales/quotations/${qt.id}`)}
                >
                  <TableCell className="font-mono text-sm" dir="ltr">{qt.number}</TableCell>
                  <TableCell className="text-sm">{formatDate(qt.date)}</TableCell>
                  <TableCell className="text-sm">{customerName(qt.customer_id)}</TableCell>
                  <TableCell className="text-end tabular-nums text-sm font-medium">
                    {formatMoney(qt.totals.grand_total, lang)}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      variant={quotePillVariant(qt.status)}
                      label={t(`quote.status_${qt.status}`)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(qt.valid_until)}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => nav(`/sales/quotations/${qt.id}`)}>
                          <Eye className="size-4 me-2" />
                          {t("quote.action_view")}
                        </DropdownMenuItem>
                        {canConvert && qt.status === "accepted" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              toast.success(t("quote.converted"));
                              nav("/sales/invoices/new");
                            }}>
                              <ArrowRightLeft className="size-4 me-2" />
                              {t("quote.action_convert")}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => toast.success(t("quote.saved_draft"))}>
                          <Copy className="size-4 me-2" />
                          {t("quote.action_duplicate")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
