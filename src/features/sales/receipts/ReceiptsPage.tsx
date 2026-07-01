import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { DatePicker }    from "@/components/patterns/DatePicker";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DrawerShell } from "@/components/patterns/DrawerShell";

import { Plus, Wallet, Info, Search } from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { useCan } from "@/lib/permissions";
import {
  useSalesData,
  type Receipt,
  type SalesData,
} from "@/features/sales/invoices/useSalesData";

// ── New Receipt Sheet ─────────────────────────────────────────────

interface NewReceiptSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: SalesData;
}

function NewReceiptSheet({ open, onOpenChange, data }: NewReceiptSheetProps) {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";

  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId]   = useState("");
  const [amount, setAmount]         = useState("");
  const [method, setMethod]         = useState("");
  const [treasury, setTreasury]     = useState("");
  const [date, setDate]             = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);

  const customers  = data.customers;
  const invoices   = data.invoices;
  const payMethods = data.paymentMethods;
  const treasuries = data.treasuries;

  const openInvoices = useMemo(() =>
    invoices.filter(inv => inv.customer_id === customerId && inv.balance > 0),
    [invoices, customerId],
  );

  const selectedInv = invoices.find(inv => inv.id === invoiceId);

  function handleCustomerChange(cid: string) {
    setCustomerId(cid);
    setInvoiceId("");
    setAmount("");
  }

  function handleInvoiceChange(iid: string) {
    setInvoiceId(iid);
    const inv = invoices.find(i => i.id === iid);
    if (inv) setAmount(inv.balance.toFixed(2));
  }

  const canSubmit = customerId && invoiceId && +amount > 0 && method && treasury;

  async function handleSave() {
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    toast.success(t("receipt.saved"));
    onOpenChange(false);
    setCustomerId(""); setInvoiceId(""); setAmount("");
    setMethod(""); setTreasury(""); setNotes("");
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("receipt.new")}
      size="lg"
      footer={
        <>
          <span className="me-auto font-semibold tabular-nums text-sm">
            {+amount > 0 ? formatMoney(+amount, lang) : "—"}
          </span>
          <Button disabled={!canSubmit || submitting} onClick={handleSave}>
            {submitting ? "…" : t("receipt.new")}
          </Button>
        </>
      }
    >
        <div className="space-y-5">
          {/* Customer */}
          <div className="space-y-2">
            <Label>{t("editor.customer")}</Label>
            <Select value={customerId} onValueChange={handleCustomerChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("receipt.select_customer")} />
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {lang === "ar" ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Open invoices */}
          {customerId && (
            <div className="space-y-2">
              <Label>{t("receipt.open_invoices")}</Label>
              {openInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("list.no_results")}</p>
              ) : (
                <Select value={invoiceId} onValueChange={handleInvoiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("receipt.select_invoice")} />
                  </SelectTrigger>
                  <SelectContent>
                    {openInvoices.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>
                        <span className="font-mono" dir="ltr">{inv.number}</span>
                        {" — "}
                        {t("receipt.balance")}: {formatMoney(inv.balance, lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label>
              {t("receipt.amount")}
              {selectedInv && (
                <span className="text-muted-foreground text-xs ms-2">
                  ({t("receipt.balance")}: {formatMoney(selectedInv.balance, lang)})
                </span>
              )}
            </Label>
            <Input
              type="number"
              min={0}
              max={selectedInv?.balance}
              step={0.01}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="tabular-nums"
              placeholder="0.00"
            />
          </div>

          {/* Method */}
          <div className="space-y-2">
            <Label>{t("receipt.method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder={t("receipt.method")} />
              </SelectTrigger>
              <SelectContent>
                {payMethods.map(pm => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {lang === "ar" ? pm.name_ar : pm.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Treasury */}
          <div className="space-y-2">
            <Label>{t("receipt.treasury")}</Label>
            <Select value={treasury} onValueChange={setTreasury}>
              <SelectTrigger>
                <SelectValue placeholder={t("receipt.treasury")} />
              </SelectTrigger>
              <SelectContent>
                {treasuries.map(tr => (
                  <SelectItem key={tr.id} value={tr.id}>
                    {lang === "ar" ? tr.name_ar : tr.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>{t("receipt.date")}</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("receipt.notes")}</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Independence notice */}
          <p className="text-xs text-muted-foreground flex items-start gap-1 border rounded p-2 bg-muted/30">
            <Info className="size-3 mt-0.5 shrink-0" />
            {t("receipt.note")}
          </p>
        </div>
    </DrawerShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function ReceiptsPage() {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const can = useCan();
  const canCreate = can("collect");

  const [search, setSearch]       = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

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
            <Button size="sm" onClick={() => setSheetOpen(true)}>
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
            action={canCreate ? { label: t("receipt.new"), onClick: () => setSheetOpen(true) } : undefined}
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

      {data && (
        <NewReceiptSheet open={sheetOpen} onOpenChange={setSheetOpen} data={data} />
      )}
    </div>
  );
}
