import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }        from "@/components/ui/button";
import { Badge }         from "@/components/ui/badge";
import { DrawerShell }   from "@/components/patterns/DrawerShell";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  Printer, Share2, Download, Wallet,
  RotateCcw, Ban, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, ExternalLink, QrCode, ChevronLeft,
} from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { cn }   from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import {
  useSalesData,
  type SalesInvoice,
  type EtaStatus,
  type PaymentStatus,
} from "./useSalesData";

/* ─── Status helpers ──────────────────────────────────────────── */

function etaPillVariant(s: EtaStatus): PillVariant {
  switch (s) {
    case "valid":          return "approved";
    case "clearing":       return "active";
    case "queued":         return "pending";
    case "rejected":
    case "buyer_rejected": return "rejected";
    case "cancelled":      return "inactive";
    default:               return "default";
  }
}

function payPillVariant(s: PaymentStatus): PillVariant {
  switch (s) {
    case "paid":     return "paid";
    case "partial":  return "pending";
    case "credit":   return "credit";
    case "returned": return "inactive";
    default:         return "default";
  }
}

/* ─── Channel badge ─────────────────────────────────────────── */

function ChannelBadge({ channel }: { channel: "e-invoice" | "e-receipt" }) {
  const { t } = useTranslation("sales");
  const isB2B = channel === "e-invoice";
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent text-xs font-medium",
        isB2B ? "bg-brand-tint text-brand-text" : "bg-success-tint text-success-text"
      )}
    >
      {isB2B ? t("list.channel_b2b") : t("list.channel_b2c")}
    </Badge>
  );
}

/* ─── Detail row ─────────────────────────────────────────────── */

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-end">{children}</span>
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────────── */

function IssuedSkeleton() {
  return (
    <div className="space-y-4 pb-6">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-40 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="rounded-sm bg-card shadow-sm p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={cn("h-3.5 rounded", i === 0 ? "w-48" : "w-full")} />
            ))}
          </div>
        </div>
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="rounded-sm bg-card shadow-sm p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 rounded w-full" />
            ))}
          </div>
          <div className="rounded-sm bg-card shadow-sm p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 rounded w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Rejection banner ───────────────────────────────────────── */

function RejectionBanner({
  reasonAr, reasonEn, onFix, lang,
}: {
  reasonAr?: string;
  reasonEn?: string;
  onFix: () => void;
  lang: "ar" | "en";
}) {
  const { t } = useTranslation("sales");
  const reason = lang === "ar" ? reasonAr : reasonEn;
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-danger-tint text-danger-text rounded-lg border border-danger/20">
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{t("issued.rejection_title")}</p>
        {reason && <p className="text-sm mt-0.5">{reason}</p>}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-danger/40 text-danger-text hover:bg-danger-tint/80"
        onClick={onFix}
      >
        <RefreshCw className="h-4 w-4 me-1.5" />
        {t("issued.fix_resend")}
      </Button>
    </div>
  );
}

/* ─── Cancelled watermark overlay ────────────────────────────── */

function CancelledWatermark({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
      <span
        className="text-6xl font-black text-danger/15 rotate-[-30deg] select-none tracking-widest"
        aria-hidden
      >
        {label}
      </span>
    </div>
  );
}

/* ─── QR placeholder ─────────────────────────────────────────── */

function QrBlock({ url }: { url: string }) {
  const { t } = useTranslation("sales");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors group"
    >
      <QrCode className="h-12 w-12 text-muted-foreground group-hover:text-foreground transition-colors" />
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {t("issued.qr")}
        <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}

/* ─── Fix & resend sheet ─────────────────────────────────────── */

function FixResendSheet({
  open,
  onClose,
  invoice,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  invoice: SalesInvoice;
  lang: "ar" | "en";
}) {
  const { t } = useTranslation("sales");
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    setSubmitting(true);
    await new Promise<void>(r => setTimeout(r, 1000));
    setSubmitting(false);
    onClose();
    toast.success(t("editor.submitted_b2b"));
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={open ? () => {} : onClose}
      title={t("issued.fix_resend")}
      description={lang === "ar" ? invoice.eta.reason_ar : invoice.eta.reason_en}
      size="md"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2">
          <p className="text-xs text-muted-foreground font-mono">
            {invoice.eta.offending_field ?? "unknown"}
          </p>
          <p className="text-sm">
            {lang === "ar" ? invoice.eta.reason_ar : invoice.eta.reason_en}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("issued.no_edit")}
        </p>
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={submitting}
            onClick={handle}
          >
            {submitting ? t("editor.submitting") : t("issued.fix_resend")}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t("issued.close")}
          </Button>
        </div>
      </div>
    </DrawerShell>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */

export function IssuedInvoicePage() {
  const { t, i18n } = useTranslation("sales");
  const lang = (i18n.language?.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const can = useCan();

  const { data, loading, error, isOffline, reload } = useSalesData();

  const [cancelOpen,    setCancelOpen]    = useState(false);
  const [fixSheetOpen,  setFixSheetOpen]  = useState(false);

  const invoice = useMemo(
    () => data?.invoices.find(inv => inv.id === id) ?? null,
    [data?.invoices, id]
  );

  const customer = useMemo(
    () => data?.customers.find(c => c.id === invoice?.customer_id) ?? null,
    [data?.customers, invoice?.customer_id]
  );

  const itemMap = useMemo(
    () => Object.fromEntries((data?.items ?? []).map(i => [i.id, i])),
    [data?.items]
  );

  const uomMap = useMemo(
    () => Object.fromEntries((data?.uoms ?? []).map(u => [u.id, u])),
    [data?.uoms]
  );

  const branchName = useMemo(() => {
    if (!invoice) return "";
    const b = data?.branches.find(b => b.id === invoice.branch_id);
    return b ? (lang === "ar" ? b.name_ar : b.name_en) : invoice.branch_id;
  }, [invoice, data?.branches, lang]);

  /* Loading */
  if (loading) return <IssuedSkeleton />;

  /* Error */
  if (error) return <ErrorState description={error} onRetry={reload} />;

  /* Invoice not found */
  if (!loading && !error && data && !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground">{t("issued.no_invoice")}</p>
        <Button variant="outline" onClick={() => navigate("/sales/invoices")}>
          <ChevronLeft className="h-4 w-4 me-1.5" />
          {t("issued.back_to_list")}
        </Button>
      </div>
    );
  }

  /* Redirect drafts to the editor */
  if (invoice?.eta_status === "draft") {
    return <Navigate to="/sales/invoices/new" replace />;
  }

  if (!invoice) return null;

  const isCancelled  = invoice.eta_status === "cancelled";
  const isRejected   = invoice.eta_status === "rejected" || invoice.eta_status === "buyer_rejected";
  const isValid      = invoice.eta_status === "valid";
  const isClearing   = invoice.eta_status === "clearing";
  const isQueued     = invoice.eta_status === "queued";
  const customerName = customer ? (lang === "ar" ? customer.name_ar : customer.name_en) : invoice.customer_id;
  const hasBalance   = invoice.balance > 0;

  /* Actions */
  const handlePrintA4      = () => toast.info(t("issued.print_a4"));
  const handlePrintThermal = () => toast.info(t("issued.print_thermal"));
  const handleWhatsApp     = () => toast.info(t("issued.share_whatsapp"));
  const handleEmail        = () => toast.info(t("issued.share_email"));
  const handleDownload     = () => toast.info(t("issued.download"));

  return (
    <div className="space-y-4 pb-6">

      {/* Header */}
      <PageHeader
        title={invoice.number}
        crumbLabel={invoice.number}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handlePrintA4}>
              <Printer className="h-4 w-4 me-1.5" />
              {t("issued.print_a4")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 me-1.5" />
              {t("issued.download")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleWhatsApp}>
              <Share2 className="h-4 w-4 me-1.5" />
              {t("issued.share_whatsapp")}
            </Button>
          </div>
        }
      />

      {/* Offline banner */}
      {isOffline && <OfflineBanner />}

      {/* Rejection banner */}
      {isRejected && (
        <RejectionBanner
          reasonAr={invoice.eta.reason_ar}
          reasonEn={invoice.eta.reason_en}
          onFix={() => setFixSheetOpen(true)}
          lang={lang}
        />
      )}

      {/* B2C queued near-expiry warning */}
      {isQueued && invoice.eta.window_remaining_hours !== undefined && invoice.eta.window_remaining_hours <= 12 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-warning-tint text-warning-text rounded-lg border border-warning/20">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">
            {t("issued.queued_deadline", { h: invoice.eta.window_remaining_hours })}
          </span>
        </div>
      )}

      {/* No-edit notice for accepted invoices */}
      {isValid && (
        <div className="flex items-start gap-2 px-4 py-2 bg-muted rounded-lg border border-border text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
          <span>{t("issued.no_edit")}</span>
        </div>
      )}

      {/* Two-pane layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* ── Left pane: invoice preview ──────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          <PageSection
            title={invoice.number}
            subtitle={formatDate(invoice.date)}
            className={cn("relative", isCancelled && "overflow-hidden")}
          >
            {isCancelled && (
              <CancelledWatermark label={t("issued.cancelled_watermark")} />
            )}

            {/* Customer + meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 mb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {t("issued.buyer_label")}
                </p>
                <p className="font-semibold">{customerName}</p>
                {customer?.trn && (
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {t("issued.trn_label")}: {customer.trn}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {t("issued.invoice_date")}
                </p>
                <p className="font-semibold tabular-nums">{formatDate(invoice.date)}</p>
                {branchName && (
                  <p className="text-sm text-muted-foreground">{branchName}</p>
                )}
              </div>
            </div>

            {/* Lines table */}
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="h-9 py-0 px-2 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("editor.col_item")}
                  </TableHead>
                  <TableHead className="h-9 py-0 px-2 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                    {t("editor.col_desc")}
                  </TableHead>
                  <TableHead className="h-9 py-0 px-2 text-end text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("editor.col_qty")}
                  </TableHead>
                  <TableHead className="h-9 py-0 px-2 text-end text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("editor.col_price")}
                  </TableHead>
                  <TableHead className="h-9 py-0 px-2 text-end text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("editor.col_total")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map((line, i) => {
                  const item = itemMap[line.item_id];
                  const itemName = item
                    ? (lang === "ar" ? item.name_ar : item.name_en)
                    : line.item_id;
                  const uom = uomMap[line.uom_id];
                  const uomLabel = uom ? (lang === "ar" ? uom.name_ar : uom.name_en) : "";
                  return (
                    <TableRow key={i} className="border-b border-border last:border-0">
                      <TableCell className="px-2 py-2.5 text-sm font-medium">
                        {itemName}
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">
                        {line.description}
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-sm text-end tabular-nums">
                        {line.qty} {uomLabel}
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-sm text-end tabular-nums">
                        {formatMoney(line.price, lang)}
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-sm text-end tabular-nums font-medium">
                        {formatMoney(line.line_total, lang)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="mt-4 border-t border-border pt-4 space-y-0 max-w-xs ms-auto">
              <DetailRow label={t("editor.subtotal")}>
                <span className="tabular-nums">{formatMoney(invoice.totals.subtotal, lang)}</span>
              </DetailRow>
              {invoice.totals.discount > 0 && (
                <DetailRow label={t("editor.total_discount")}>
                  <span className="tabular-nums text-warning-text">
                    −{formatMoney(invoice.totals.discount, lang)}
                  </span>
                </DetailRow>
              )}
              <DetailRow label={t("editor.taxable_base")}>
                <span className="tabular-nums">{formatMoney(invoice.totals.taxable_base, lang)}</span>
              </DetailRow>
              <DetailRow label={t("editor.tax")}>
                <span className="tabular-nums">{formatMoney(invoice.totals.tax, lang)}</span>
              </DetailRow>
              <div className="flex items-center justify-between py-2">
                <span className="text-base font-semibold">{t("editor.grand_total")}</span>
                <span className="text-base font-bold tabular-nums">
                  {formatMoney(invoice.totals.grand_total, lang)}
                </span>
              </div>
            </div>
          </PageSection>
        </div>

        {/* ── Right rail ──────────────────────────────────────── */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">

          {/* ETA block */}
          <PageSection title={t("issued.eta_block")}>
            <div className="space-y-0">
              <DetailRow label={t("issued.channel_label")}>
                <ChannelBadge channel={invoice.channel} />
              </DetailRow>

              {/* ETA status — shown INDEPENDENTLY from payment */}
              <DetailRow label="ETA">
                <StatusPill
                  variant={etaPillVariant(invoice.eta_status)}
                  label={t(`eta.${invoice.eta_status}`)}
                />
              </DetailRow>

              {/* Clearing note */}
              {isClearing && (
                <div className="flex items-center gap-2 py-2 text-sm text-brand-text">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{t("issued.clearing_note")}</span>
                </div>
              )}

              {/* Valid: UUID + Long ID + accepted_at + QR */}
              {isValid && invoice.eta.uuid && (
                <>
                  <DetailRow label={t("issued.uuid")}>
                    <span className="font-mono text-xs" dir="ltr">{invoice.eta.uuid}</span>
                  </DetailRow>
                  {invoice.eta.long_id && (
                    <DetailRow label={t("issued.long_id")}>
                      <span className="font-mono text-xs break-all" dir="ltr">{invoice.eta.long_id}</span>
                    </DetailRow>
                  )}
                  {invoice.eta.accepted_at && (
                    <DetailRow label={t("issued.accepted_at")}>
                      <span className="tabular-nums text-xs">{formatDate(invoice.eta.accepted_at)}</span>
                    </DetailRow>
                  )}
                  {invoice.eta.qr && (
                    <div className="pt-2">
                      <QrBlock url={invoice.eta.qr} />
                    </div>
                  )}
                </>
              )}

              {/* Queued: deadline countdown */}
              {isQueued && invoice.eta.window_remaining_hours !== undefined && (
                <DetailRow label={t("issued.queued_deadline", { h: "" })}>
                  <span className={cn(
                    "tabular-nums text-sm font-semibold",
                    invoice.eta.window_remaining_hours <= 12 ? "text-warning-text" : "text-muted-foreground"
                  )}>
                    {invoice.eta.window_remaining_hours}h
                  </span>
                </DetailRow>
              )}

              {/* Fix & resend for rejected */}
              {isRejected && can("sales.eta.resend") && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setFixSheetOpen(true)}
                  >
                    <RefreshCw className="h-4 w-4 me-1.5" />
                    {t("issued.fix_resend")}
                  </Button>
                </div>
              )}
            </div>
          </PageSection>

          {/* Payment block — INDEPENDENT from ETA */}
          <PageSection title={t("issued.payment_block")}>
            <div className="space-y-0">
              <DetailRow label={t("filters.payment")}>
                <StatusPill
                  variant={payPillVariant(invoice.payment_status)}
                  label={t(`pay.${invoice.payment_status}`)}
                />
              </DetailRow>
              <DetailRow label={t("issued.payment_collected")}>
                <span className="tabular-nums">{formatMoney(invoice.collected, lang)}</span>
              </DetailRow>
              {hasBalance && (
                <DetailRow label={t("issued.payment_balance")}>
                  <span className="tabular-nums font-semibold text-warning-text">
                    {formatMoney(invoice.balance, lang)}
                  </span>
                </DetailRow>
              )}
            </div>
            {hasBalance && can("sales.payment.collect") && (
              <div className="mt-3">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => { toast.info(t("issued.collect")); }}
                >
                  <Wallet className="h-4 w-4 me-1.5" />
                  {t("issued.collect")}
                </Button>
              </div>
            )}
          </PageSection>

          {/* Actions block */}
          <PageSection title="">
            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={handlePrintA4}
              >
                <Printer className="h-4 w-4 me-2" />
                {t("issued.print_a4")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={handlePrintThermal}
              >
                <Printer className="h-4 w-4 me-2" />
                {t("issued.print_thermal")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={handleWhatsApp}
              >
                <Share2 className="h-4 w-4 me-2" />
                {t("issued.share_whatsapp")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={handleEmail}
              >
                <Share2 className="h-4 w-4 me-2" />
                {t("issued.share_email")}
              </Button>

              {/* Create credit note — only for valid invoices */}
              {isValid && can("sales.creditnote.create") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => toast.info(t("issued.create_return"))}
                >
                  <RotateCcw className="h-4 w-4 me-2" />
                  {t("issued.create_return")}
                </Button>
              )}

              {/* Cancel invoice — gated */}
              {!isCancelled && can("sales.invoice.cancel") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-danger-tint border-border"
                  onClick={() => setCancelOpen(true)}
                >
                  <Ban className="h-4 w-4 me-2" />
                  {t("issued.cancel")}
                </Button>
              )}
            </div>
          </PageSection>

        </div>
      </div>

      {/* Fix & resend sheet */}
      <FixResendSheet
        open={fixSheetOpen}
        onClose={() => setFixSheetOpen(false)}
        invoice={invoice}
        lang={lang}
      />

      {/* Cancel invoice confirm */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("issued.cancel")}
        description={t("issued.cancel_confirm")}
        confirmTone="danger"
        confirmLabel={t("issued.cancel")}
        cancelLabel={t("issued.close")}
        onConfirm={() => {
          setCancelOpen(false);
          toast.info(t("issued.cancel"));
        }}
      />
    </div>
  );
}
