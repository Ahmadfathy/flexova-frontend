import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Download, Search, FileText, Printer, MoreVertical, Loader2 } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { EntityCell }    from "@/components/patterns/DataTable";
import { DatePicker }    from "@/components/patterns/DatePicker";
import { Skeleton }      from "@/components/patterns/Skeletons";

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
import { ModalShell } from "@/components/patterns/ModalShell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { usePurchasingData } from "../data/usePurchasingData";

// ── Helpers ───────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Skeleton ──────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

// ── Create dialog state ───────────────────────────────────────────

interface VoucherForm {
  supplier_id:    string;
  invoice_id:     string;
  amount:         string;
  method_id:      string;
  treasury_id:    string;
  date:           string;
  notes:          string;
}

function emptyForm(): VoucherForm {
  return {
    supplier_id: "", invoice_id: "", amount: "",
    method_id: "", treasury_id: "", date: today(), notes: "",
  };
}

// ── Main ──────────────────────────────────────────────────────────

export function PurchaseVouchersPage() {
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const can = useCan();

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  const [search, setSearch]           = useState("");
  const [supplierFilter, setSupplier] = useState("");
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [form, setForm]               = useState<VoucherForm>(emptyForm());
  const [saving, setSaving]           = useState(false);

  // ── Auto-open from ?invoice= or ?supplier= params ─────────────
  useEffect(() => {
    const invoiceId  = searchParams.get("invoice");
    const supplierId = searchParams.get("supplier");
    if (!data) return;
    if (invoiceId || supplierId) {
      const inv = invoiceId ? data.purchaseInvoices.find(i => i.id === invoiceId) : null;
      const newForm = emptyForm();
      if (inv) {
        newForm.supplier_id = inv.supplier_id;
        newForm.invoice_id  = inv.id;
        newForm.amount      = String(inv.balance > 0 ? inv.balance : "");
      } else if (supplierId) {
        newForm.supplier_id = supplierId;
      }
      setForm(newForm);
      setDialogOpen(true);
    }
  }, [searchParams, data]);

  // ── Lookup maps ───────────────────────────────────────────────
  const supplierMap = useMemo(
    () => Object.fromEntries((data?.suppliers ?? []).map(s => [s.id, s])),
    [data?.suppliers],
  );

  // ── Invoices with outstanding balance for selected supplier ───
  const payableInvoices = useMemo(() => {
    if (!data || !form.supplier_id) return [];
    return data.purchaseInvoices.filter(
      i => i.supplier_id === form.supplier_id && i.balance > 0,
    );
  }, [data, form.supplier_id]);

  const selectedInvoice = useMemo(
    () => data?.purchaseInvoices.find(i => i.id === form.invoice_id),
    [data, form.invoice_id],
  );

  // ── Filter list ───────────────────────────────────────────────
  const allVouchers = data?.paymentVouchers ?? [];
  const filtered = useMemo(() => {
    let list = allVouchers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v => {
        const s = supplierMap[v.supplier_id];
        return (
          v.number.toLowerCase().includes(q) ||
          s?.name_ar?.toLowerCase().includes(q) ||
          s?.name_en?.toLowerCase().includes(q)
        );
      });
    }
    if (supplierFilter) list = list.filter(v => v.supplier_id === supplierFilter);
    return list;
  }, [allVouchers, search, supplierFilter, supplierMap]);

  // ── Form field helpers ────────────────────────────────────────
  const set = useCallback(
    <K extends keyof VoucherForm>(k: K, v: VoucherForm[K]) =>
      setForm(prev => ({ ...prev, [k]: v })),
    [],
  );

  const setInvoice = useCallback((invoiceId: string) => {
    const inv = data?.purchaseInvoices.find(i => i.id === invoiceId);
    setForm(prev => ({
      ...prev,
      invoice_id: invoiceId,
      amount: inv ? String(inv.balance) : prev.amount,
    }));
  }, [data]);

  const setSupplierField = useCallback((supplierId: string) => {
    setForm(prev => ({ ...prev, supplier_id: supplierId, invoice_id: "", amount: "" }));
  }, []);

  // ── Validation ────────────────────────────────────────────────
  const amount = parseFloat(form.amount) || 0;
  const maxAmount = selectedInvoice?.balance ?? Infinity;
  const amountError = amount > 0 && selectedInvoice && amount > maxAmount;

  const isValid = (
    form.supplier_id &&
    form.invoice_id &&
    amount > 0 &&
    !amountError &&
    form.method_id &&
    form.treasury_id &&
    form.date
  );

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setDialogOpen(false);
    setForm(emptyForm());
    toast.success(t("vouchers.saved_toast"));
    navigate("/purchasing/vouchers");
  }, [isValid, t, navigate]);

  const openNew = useCallback(() => {
    setForm(emptyForm());
    setDialogOpen(true);
  }, []);

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("vouchers.title")} />
        <PageSection padded={false}><ListSkeleton /></PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("vouchers.title")} />
        <PageSection>
          <ErrorState description={t("errors.load")} onRetry={reload} />
        </PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("vouchers.title")}
          subtitle={allVouchers.length > 0 ? t("vouchers.count", { n: allVouchers.length }) : undefined}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 me-1.5" />
                {t("vouchers.export")}
              </Button>
              {can("purchasing.payment.create") && (
                <Button size="sm" onClick={openNew}>
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("vouchers.new")}
                </Button>
              )}
            </div>
          }
        />

        {isOffline && <OfflineBanner />}

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("vouchers.search_placeholder")}
              className="ps-9"
            />
          </div>
          <Select
            value={supplierFilter || "__all__"}
            onValueChange={v => setSupplier(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-10 w-auto min-w-40">
              <SelectValue placeholder={t("vouchers.all_suppliers")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("vouchers.all_suppliers")}</SelectItem>
              {(data?.suppliers ?? []).map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {lang === "ar" ? s.name_ar : s.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <PageSection padded={false}>
          {allVouchers.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("vouchers.no_vouchers")}
              description={t("vouchers.empty_sub")}
              action={can("purchasing.payment.create")
                ? { label: t("vouchers.new"), onClick: openNew }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("vouchers.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSupplier(""); }}>
                {t("vouchers.clear_filters")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_number")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_date")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_supplier")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_invoice")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-end">
                    {t("vouchers.col_amount")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vouchers.col_method")}
                  </TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(v => {
                  const s   = supplierMap[v.supplier_id];
                  const sName = s ? (lang === "ar" ? s.name_ar : s.name_en) : v.supplier_id;
                  const inv = data?.purchaseInvoices.find(i => i.id === v.invoice_id);
                  const method = data?.paymentMethods.find(m => m.id === v.method);
                  const methodName = method
                    ? (lang === "ar" ? method.name_ar : method.name_en)
                    : v.method;
                  return (
                    <TableRow
                      key={v.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <TableCell>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
                          {v.number}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDate(v.date)}
                      </TableCell>
                      <TableCell>
                        <EntityCell
                          name={sName}
                          sub={s?.code}
                          avatarFallback={sName.slice(0, 2)}
                        />
                      </TableCell>
                      <TableCell>
                        {inv ? (
                          <button
                            className="font-mono text-xs text-brand hover:underline"
                            dir="ltr"
                            onClick={() => navigate(`/purchasing/invoices/${v.invoice_id}`)}
                          >
                            {inv.number}
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                            {v.invoice_id}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-semibold">
                        {formatMoney(v.amount, lang)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {methodName}
                      </TableCell>
                      <TableCell className="w-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast.info(t("vouchers.action_print"))}>
                              <Printer className="h-4 w-4 me-2" />
                              {t("vouchers.action_print")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </PageSection>
      </div>

      {/* Create dialog */}
      <ModalShell
        open={dialogOpen}
        onOpenChange={open => { if (!open) setDialogOpen(false); }}
        title={t("vouchers.form_title")}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common:cancel", "Cancel")}
            </Button>
            <Button disabled={!isValid || saving} onClick={handleSave}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              {t("common:save", "Save")}
            </Button>
          </>
        }
      >
          <div className="space-y-4 py-1">
            {/* Supplier */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("vouchers.supplier_label")} *</Label>
              <Select value={form.supplier_id} onValueChange={setSupplierField}>
                <SelectTrigger className={cn(!form.supplier_id && "border-muted-foreground/40")}>
                  <SelectValue placeholder={t("vouchers.supplier_ph")} />
                </SelectTrigger>
                <SelectContent>
                  {(data?.suppliers ?? []).filter(s => s.status === "active").map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {lang === "ar" ? s.name_ar : s.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("vouchers.invoice_label")} *</Label>
              <Select
                value={form.invoice_id}
                onValueChange={setInvoice}
                disabled={!form.supplier_id || payableInvoices.length === 0}
              >
                <SelectTrigger className={cn(!form.invoice_id && "border-muted-foreground/40")}>
                  <SelectValue placeholder={
                    !form.supplier_id
                      ? t("vouchers.supplier_ph")
                      : payableInvoices.length === 0
                        ? t("vouchers.no_payable")
                        : t("vouchers.invoice_ph")
                  } />
                </SelectTrigger>
                <SelectContent>
                  {payableInvoices.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      <span dir="ltr" className="font-mono text-xs">{inv.number}</span>
                      <span className="ms-2 text-muted-foreground text-xs">
                        {t("vouchers.invoice_balance", { amount: formatMoney(inv.balance, lang) })}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount + Date row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("vouchers.amount_label")} *</Label>
                <Input
                  type="number" min={0.01} step="0.01"
                  className={cn("tabular-nums text-end", amountError && "border-danger")}
                  value={form.amount}
                  onChange={e => set("amount", e.target.value)}
                />
                {amountError && (
                  <p className="text-xs text-danger">
                    {t("vouchers.amount_exceeds", { max: formatMoney(maxAmount, lang) })}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("vouchers.date_label")} *</Label>
                <DatePicker value={form.date} onChange={val => set("date", val)} />
              </div>
            </div>

            {/* Method + Treasury row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("vouchers.method_label")} *</Label>
                <Select value={form.method_id} onValueChange={v => set("method_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.paymentMethods ?? []).map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {lang === "ar" ? m.name_ar : m.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("vouchers.treasury_label")} *</Label>
                <Select value={form.treasury_id} onValueChange={v => set("treasury_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.treasuries ?? []).map(tr => (
                      <SelectItem key={tr.id} value={tr.id}>
                        {lang === "ar" ? tr.name_ar : tr.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("vouchers.notes_label")}</Label>
              <Textarea
                rows={2}
                className="resize-none"
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
              />
            </div>
          </div>
      </ModalShell>
    </>
  );
}
