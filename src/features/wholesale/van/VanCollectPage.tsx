import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, HandCoins } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { CreditBar } from "@/components/wholesale/CreditBar";
import { AllocationTable, type AllocationInvoiceRow } from "@/components/wholesale/AllocationTable";
import { CollectionReceiptDialog } from "./CollectionReceiptDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { isFlagEnabled } from "@/lib/flags";
import { useVanSession } from "@/stores/vanSession";
import { useWholesaleCustomers } from "@/stores/wholesaleCustomers";
import { useWholesaleCreditReservations } from "@/stores/wholesaleCreditReservations";
import { useWholesaleSyncQueue } from "@/stores/wholesaleSyncQueue";
import {
  useWholesaleCollections, nextCollectionNumber, getAllocatedTotal,
} from "@/stores/wholesaleCollections";
import { useWholesaleVanShifts } from "@/stores/wholesaleVanShifts";
import { getReps } from "@/lib/mock/wholesale";
import { computeCollectionCommission, type CollectionCommission } from "@/lib/wholesale/commission";
import type { Collection } from "@/types/wholesale";
import salesFixtures from "@/lib/mock/fixtures/sales.fixtures.json";

interface SalesInvoiceSlim { id: string; number: string; date: string; customer_id: string; balance: number; totals: { grand_total: number }; }
const SALES_INVOICES = salesFixtures.invoices as SalesInvoiceSlim[];

const PAYMENT_METHODS = (salesFixtures.payment_methods as { id: string; name_ar: string; name_en: string }[])
  .filter((m) => m.id !== "pm_credit");

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function VanCollectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("van");
  const { lang } = useAppearance();

  const session = useVanSession();
  const customers = useWholesaleCustomers((s) => s.customers);
  const adjustArBalance = useWholesaleCustomers((s) => s.adjustArBalance);
  const reservations = useWholesaleCreditReservations((s) => s.reservations);
  const enqueueSync = useWholesaleSyncQueue((s) => s.enqueue);
  const collections = useWholesaleCollections((s) => s.collections);
  const addCollection = useWholesaleCollections((s) => s.addCollection);
  const shifts = useWholesaleVanShifts((s) => s.shifts);
  const postCollectionCash = useWholesaleVanShifts((s) => s.postCollectionCash);

  const customer = customers.find((c) => c.id === id);
  const rep = useMemo(() => getReps().find((r) => r.id === session.repId), [session.repId]);
  const currentShift = useMemo(
    () => shifts.find((s) => s.rep_id === session.repId && s.status === "open"),
    [shifts, session.repId],
  );

  const invoiceRows: AllocationInvoiceRow[] = useMemo(() => {
    return SALES_INVOICES
      .filter((inv) => inv.customer_id === id)
      .map((inv) => ({
        id: inv.id,
        number: inv.number,
        date: inv.date,
        total: inv.totals.grand_total,
        outstanding: round2(Math.max(0, inv.balance - getAllocatedTotal(collections, inv.id))),
      }))
      .filter((inv) => inv.outstanding > 0.005)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [id, collections]);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [onAccountOpen, setOnAccountOpen] = useState(false);
  const [pendingUnallocated, setPendingUnallocated] = useState(0);
  const [receiptCollection, setReceiptCollection] = useState<Collection | null>(null);
  const [receiptCommission, setReceiptCommission] = useState<CollectionCommission | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  function autoFill(amt: number) {
    let remaining = amt;
    const next: Record<string, number> = {};
    for (const inv of invoiceRows) {
      if (remaining <= 0) { next[inv.id] = 0; continue; }
      const alloc = Math.min(remaining, inv.outstanding);
      next[inv.id] = round2(alloc);
      remaining = round2(remaining - alloc);
    }
    setAllocations(next);
  }

  useEffect(() => {
    if (manuallyEdited) return;
    autoFill(parseFloat(amount) || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, invoiceRows]);

  const amountNum = parseFloat(amount) || 0;
  const allocatedTotal = round2(Object.values(allocations).reduce((s, v) => s + (v || 0), 0));
  const unallocated = round2(amountNum - allocatedTotal);
  const commissionPreview = amountNum > 0 ? computeCollectionCommission(rep, amountNum) : null;

  function handleAllocate(invoiceId: string, value: number) {
    setManuallyEdited(true);
    setAllocations((prev) => ({ ...prev, [invoiceId]: value }));
  }

  function handleAutoFillClick() {
    setManuallyEdited(false);
    autoFill(amountNum);
  }

  function commitCollection(unallocatedAmount: number) {
    const allocationsArr = invoiceRows
      .filter((inv) => (allocations[inv.id] || 0) > 0)
      .map((inv) => ({ invoice_id: inv.id, amount: round2(allocations[inv.id]) }));

    const collection: Collection = {
      id: crypto.randomUUID(),
      number: nextCollectionNumber(collections),
      date: todayStr(),
      customer_id: id ?? "",
      rep_id: session.repId ?? "",
      shift_id: currentShift?.id ?? "",
      amount: amountNum,
      payment_method: method,
      allocations: allocationsArr,
      unallocated: unallocatedAmount,
      ...(unallocatedAmount > 0 ? { _flag: "on_account" as const } : {}),
    };

    addCollection(collection);
    adjustArBalance(collection.customer_id, -amountNum);
    if (currentShift) postCollectionCash(currentShift.id, amountNum);
    enqueueSync({ op: "collection", shift_id: currentShift?.id ?? "", client_uuid: crypto.randomUUID() });

    setReceiptCollection(collection);
    setReceiptCommission(computeCollectionCommission(rep, amountNum));
    setReceiptOpen(true);
    toast.success(t("collect.success_toast"));
  }

  function handleSubmit() {
    if (amountNum <= 0) { toast.error(t("collect.error_amount_required")); return; }
    if (!method) { toast.error(t("collect.error_method_required")); return; }
    if (unallocated !== 0) {
      setPendingUnallocated(unallocated);
      setOnAccountOpen(true);
      return;
    }
    commitCollection(0);
  }

  function confirmOnAccount() {
    setOnAccountOpen(false);
    commitCollection(pendingUnallocated);
  }

  function handleReceiptClose(open: boolean) {
    setReceiptOpen(open);
    if (!open) navigate(-1);
  }

  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  if (!customer) {
    return (
      <div className="h-full overflow-auto p-4">
        <EmptyState icon={HandCoins} title={t("collect.not_found")} description="" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <BackIcon className="h-4 w-4 me-1" />
          {t("collect.back")}
        </Button>

        <PageHeader title={t("collect.title")} subtitle={lang === "ar" ? customer.name_ar : customer.name_en} />

        <PageSection>
          <CreditBar customer={customer} reservations={reservations} />
        </PageSection>

        <PageSection title={t("collect.fields_title")}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("collect.field_amount")} *</label>
              <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("collect.field_method")} *</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder={t("collect.select_method")} /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{lang === "ar" ? m.name_ar : m.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("collect.field_note")}</label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        </PageSection>

        <PageSection title={t("collect.allocation_title")} padded>
          <AllocationTable
            invoices={invoiceRows}
            amount={amountNum}
            allocations={allocations}
            onAllocate={handleAllocate}
            onAutoFill={handleAutoFillClick}
            lang={lang}
          />
        </PageSection>

        {isFlagEnabled("hr") && commissionPreview && (
          <div className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm text-muted-foreground">
            <span>{t("collect.commission_basis")}</span>
            <span className="tabular-nums">{formatMoney(commissionPreview.amount, lang)}</span>
          </div>
        )}

        <Button className="w-full" onClick={handleSubmit}>{t("collect.submit")}</Button>
      </div>

      <ConfirmDialog
        open={onAccountOpen}
        onOpenChange={setOnAccountOpen}
        title={t("collect.on_account_confirm_title")}
        description={t("collect.on_account_confirm_body", { amount: formatMoney(pendingUnallocated, lang) })}
        confirmTone="warning"
        confirmLabel={t("collect.on_account_confirm_action")}
        onConfirm={confirmOnAccount}
      />

      <CollectionReceiptDialog
        collection={receiptCollection}
        customer={customer}
        commission={receiptCommission}
        open={receiptOpen}
        onOpenChange={handleReceiptClose}
        lang={lang}
      />
    </div>
  );
}
