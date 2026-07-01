import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }   from "@/components/ui/button";
import { Label }    from "@/components/ui/label";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DrawerShell } from "@/components/patterns/DrawerShell";

import { Plus, FilePlus2, Info } from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { useCan } from "@/lib/permissions";
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

// ── New Debit Note Sheet ──────────────────────────────────────────

interface NewDebitNoteSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function NewDebitNoteSheet({ open, onOpenChange }: NewDebitNoteSheetProps) {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const { data } = useSalesData();

  const [sourceId, setSourceId]   = useState("");
  const [reason, setReason]       = useState("");
  const [desc, setDesc]           = useState("");
  const [amount, setAmount]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  const invoices = (data?.invoices ?? []).filter(
    inv => inv.eta_status === "valid"
  );

  const canSubmit = sourceId && reason.trim() && +amount > 0;

  async function handleIssue() {
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    toast.success(t("debit.issued"));
    onOpenChange(false);
    setSourceId(""); setReason(""); setDesc(""); setAmount("");
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={t("debit.new")}
      size="lg"
      footer={
        <>
          <span className="me-auto font-semibold tabular-nums text-sm">
            {+amount > 0 ? formatMoney(+amount * 1.14, lang) : "—"}
          </span>
          <Button disabled={!canSubmit || submitting} onClick={handleIssue}>
            {submitting ? "…" : t("debit.issue")}
          </Button>
        </>
      }
    >
        <div className="space-y-5">
          {/* Source invoice */}
          <div className="space-y-2">
            <Label>{t("debit.source_invoice")}</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder={t("debit.search_invoice")} />
              </SelectTrigger>
              <SelectContent>
                {invoices.map(inv => (
                  <SelectItem key={inv.id} value={inv.id}>
                    <span className="font-mono" dir="ltr">{inv.number}</span>
                    {" — "}
                    {formatMoney(inv.totals.grand_total, lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Charge description */}
          <div className="space-y-2">
            <Label>{t("debit.desc")}</Label>
            <Input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder={t("debit.desc")}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>
              {t("debit.amount")}
              <span className="text-destructive ms-1">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="tabular-nums"
              placeholder="0.00"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>
              {t("debit.reason")}
              <span className="text-destructive ms-1">*</span>
            </Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t("debit.reason")}
            />
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-1 border rounded p-2 bg-muted/30">
            <Info className="size-3 mt-0.5 shrink-0" />
            {t("debit.note_eta")}
          </p>
        </div>
    </DrawerShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function DebitNotesPage() {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const can = useCan();
  const canCreate = can("return");

  const [sheetOpen, setSheetOpen] = useState(false);
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
            <Button size="sm" onClick={() => setSheetOpen(true)}>
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
            action={canCreate ? { label: t("debit.new"), onClick: () => setSheetOpen(true) } : undefined}
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

      <NewDebitNoteSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
