import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Printer, RotateCcw, CreditCard } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }    from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatMoney }  from "@/lib/format";
import { cn }           from "@/lib/utils";
import { useCan }       from "@/lib/permissions";
import { usePurchasingData } from "../data/usePurchasingData";
import {
  receiptPillVariant, paymentPillVariant, inboundEtaPillVariant,
} from "../data/statusHelpers";

// ── Helpers ──────────────────────────────────────────────────────

function LabelValue({ label, value, mono = false }: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-sm", mono && "font-mono")} dir={mono ? "ltr" : undefined}>
        {value}
      </p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────

export function PurchaseInvoiceViewPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation("purchasing");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const navigate = useNavigate();
  const can = useCan();

  const { data, loading, error, isOffline, reload } = usePurchasingData();

  // ── Loading / error ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader title="…" />
        <PageSection>
          <div className="space-y-4 p-6">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="…" />
        <PageSection>
          <ErrorState description={t("errors.load")} onRetry={reload} />
        </PageSection>
      </div>
    );
  }

  const invoice = data?.purchaseInvoices.find(i => i.id === id);

  if (!data || !invoice) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={t("view.not_found")}
          crumbLabel={t("view.not_found")}
        />
        <PageSection>
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t("view.not_found_sub")}
          </div>
        </PageSection>
      </div>
    );
  }

  const supplier = data.suppliers.find(s => s.id === invoice.supplier_id);
  const warehouse = data.warehouses.find(w => w.id === invoice.warehouse_id);
  const paymentMethod = data.paymentMethods.find(m => m.id === invoice.payment_method);
  const etaRecord = invoice.inbound_eta_uuid
    ? data.inboundEta.find(e => e.uuid === invoice.inbound_eta_uuid)
    : null;

  const supplierName = supplier
    ? (lang === "ar" ? supplier.name_ar : supplier.name_en) : invoice.supplier_id;
  const warehouseName = warehouse
    ? (lang === "ar" ? warehouse.name_ar : warehouse.name_en) : invoice.warehouse_id;
  const paymentMethodName = paymentMethod
    ? (lang === "ar" ? paymentMethod.name_ar : paymentMethod.name_en) : invoice.payment_method;

  const receiptLabel  = t(`receipt.${invoice.receipt_status === "partially_received" ? "partial" : invoice.receipt_status}`);
  const paymentLabel  = t(`pay.${invoice.payment_status}`);
  const inboundLabel  = t(`inbound.${invoice.inbound_eta_status}`);

  const isCompleted  = invoice.receipt_status === "completed";
  const hasBalance   = invoice.balance > 0;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={invoice.number}
        crumbLabel={invoice.number}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => toast.info(t("view.print"))}
            >
              <Printer className="h-4 w-4 me-1.5" />
              {t("view.print")}
            </Button>
            {isCompleted && can("purchasing.return.create") && (
              <Button
                variant="outline" size="sm"
                onClick={() => navigate(`/purchasing/returns/new?source=${invoice.id}`)}
              >
                <RotateCcw className="h-4 w-4 me-1.5" />
                {t("view.return_action")}
              </Button>
            )}
            {hasBalance && can("purchasing.voucher.create") && (
              <Button
                size="sm"
                onClick={() => navigate(`/purchasing/vouchers/new?invoice=${invoice.id}`)}
              >
                <CreditCard className="h-4 w-4 me-1.5" />
                {t("view.pay_action")}
              </Button>
            )}
          </div>
        }
      />

      {isOffline && <OfflineBanner />}

      {/* ── Status pills ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 px-6 lg:px-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("view.receipt_status")}:</span>
          <StatusPill variant={receiptPillVariant(invoice.receipt_status)} label={receiptLabel} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("view.payment_status")}:</span>
          <StatusPill variant={paymentPillVariant(invoice.payment_status)} label={paymentLabel} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("view.inbound_status")}:</span>
          <StatusPill variant={inboundEtaPillVariant(invoice.inbound_eta_status)} label={inboundLabel} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* ── Left: details + lines + totals ─────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Header info grid */}
          <PageSection>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6">
              <LabelValue label={t("view.supplier")} value={supplierName} />
              <LabelValue label={t("view.date")} value={invoice.date} />
              <LabelValue
                label={t("view.supplier_inv")}
                value={invoice.supplier_invoice_no || "—"}
                mono
              />
              <LabelValue label={t("view.warehouse")} value={warehouseName} />
              <LabelValue label={t("view.payment")} value={paymentMethodName} />
              {etaRecord && (
                <LabelValue
                  label={t("view.inbound_eta")}
                  value={etaRecord.uuid}
                  mono
                />
              )}
            </div>
          </PageSection>

          {/* Lines table */}
          <PageSection padded={false}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">{t("view.col_item")}</TableHead>
                    <TableHead className="text-xs w-20">{t("view.col_qty")}</TableHead>
                    <TableHead className="text-xs w-24">{t("view.col_uom")}</TableHead>
                    <TableHead className="text-xs w-28">{t("view.col_price")}</TableHead>
                    <TableHead className="text-xs w-24">{t("view.col_discount")}</TableHead>
                    <TableHead className="text-xs w-32">{t("view.col_tax")}</TableHead>
                    <TableHead className="text-xs w-28">{t("view.col_total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines.map((line, i) => {
                    const item = data.items.find(it => it.id === line.item_id);
                    const uom  = data.uoms.find(u => u.id === line.uom_id);
                    const tt   = data.taxTypes.find(t => t.id === line.tax_type_id);
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {item
                            ? (lang === "ar" ? item.name_ar : item.name_en)
                            : line.item_id}
                        </TableCell>
                        <TableCell className="text-sm text-start tabular-nums">
                          {line.qty}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {uom
                            ? (lang === "ar" ? uom.name_ar : uom.name_en)
                            : line.uom_id}
                        </TableCell>
                        <TableCell className="text-sm text-start tabular-nums">
                          {formatMoney(line.purchase_price, lang)}
                        </TableCell>
                        <TableCell className="text-sm text-start tabular-nums text-muted-foreground">
                          {line.line_discount > 0
                            ? `−${formatMoney(line.line_discount, lang)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tt ? (lang === "ar" ? tt.name_ar : tt.name_en) : line.tax_type_id}
                        </TableCell>
                        <TableCell className="text-sm text-start tabular-nums font-medium">
                          {formatMoney(line.line_total, lang)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </PageSection>
        </div>

        {/* ── Right rail: totals + balance ───────────────── */}
        <div className="w-full lg:w-72 shrink-0">
          <PageSection>
            <div className="space-y-2 text-sm p-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("view.subtotal")}</span>
                <span className="tabular-nums">
                  {formatMoney(invoice.totals.subtotal, lang)}
                </span>
              </div>
              {invoice.totals.discount > 0 && (
                <div className="flex justify-between text-warning">
                  <span>{t("view.discount")}</span>
                  <span className="tabular-nums">
                    −{formatMoney(invoice.totals.discount, lang)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("view.tax")}</span>
                <span className="tabular-nums">
                  {formatMoney(invoice.totals.tax, lang)}
                </span>
              </div>
              {invoice.totals.additional_costs > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("view.addl_costs")}</span>
                  <span className="tabular-nums">
                    {formatMoney(invoice.totals.additional_costs, lang)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>{t("view.grand_total")}</span>
                <span className="tabular-nums">
                  {formatMoney(invoice.totals.grand_total, lang)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-muted-foreground">
                <span>{t("view.paid")}</span>
                <span className="tabular-nums">
                  {formatMoney(invoice.paid, lang)}
                </span>
              </div>
              <div className={cn(
                "flex justify-between font-medium",
                invoice.balance > 0 ? "text-warning" : "text-success",
              )}>
                <span>{t("view.balance")}</span>
                <span className="tabular-nums">
                  {formatMoney(invoice.balance, lang)}
                </span>
              </div>
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  );
}
