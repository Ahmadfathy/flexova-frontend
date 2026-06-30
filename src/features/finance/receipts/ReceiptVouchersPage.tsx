import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Download, Search, Loader2, HandCoins } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { EntityCell }    from "@/components/patterns/DataTable";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { DatePicker }    from "@/components/patterns/DatePicker";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Badge }     from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ModalShell } from "@/components/patterns/ModalShell";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useFinanceData } from "../data/useFinanceData";

function today() { return new Date().toISOString().split("T")[0]; }

function CreateDialog({
  open, onClose, data, lang, t,
}: {
  open: boolean;
  onClose: () => void;
  data: ReturnType<typeof useFinanceData>["data"];
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"finance">>["t"];
}) {
  const [customerId, setCust] = useState("");
  const [date, setDate]       = useState(today());
  const [amount, setAmount]   = useState("");
  const [treasuryId, setTr]   = useState("");
  const [memo, setMemo]       = useState("");
  const [saving, setSaving]   = useState(false);

  const isValid = customerId && date && parseFloat(amount) > 0 && treasuryId;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("receipts.saved_toast"));
  }

  if (!data) return null;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("receipts.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!isValid || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("receipts.customer_label")} *</Label>
          <Select value={customerId} onValueChange={setCust}>
            <SelectTrigger className={cn(!customerId && "border-muted-foreground/40")}>
              <SelectValue placeholder={t("receipts.customer_ph")} />
            </SelectTrigger>
            <SelectContent>
              {data.customers.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {lang === "ar" ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("receipts.date_label")} *</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("receipts.amount_label")} *</Label>
          <Input
            type="number" min={0.01} step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="tabular-nums text-start"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("receipts.treasury_label")} *</Label>
          <Select value={treasuryId} onValueChange={setTr}>
            <SelectTrigger className={cn(!treasuryId && "border-muted-foreground/40")}>
              <SelectValue placeholder={t("receipts.treasury_ph")} />
            </SelectTrigger>
            <SelectContent>
              {data.treasuries.map(tr => (
                <SelectItem key={tr.id} value={tr.id}>
                  {lang === "ar" ? tr.name_ar : tr.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("receipts.memo_label")}</Label>
          <Input value={memo} onChange={e => setMemo(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
}

export function ReceiptVouchersPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useFinanceData();

  const [search, setSearch]     = useState("");
  const [trFilter, setTr]       = useState("");
  const [createOpen, setCreate] = useState(false);

  const allVouchers = data?.receiptVouchers ?? [];

  const customerMap = useMemo(
    () => Object.fromEntries((data?.customers ?? []).map(c => [c.id, c])),
    [data?.customers],
  );
  const trMap = useMemo(
    () => Object.fromEntries((data?.treasuries ?? []).map(tr => [tr.id, tr])),
    [data?.treasuries],
  );

  const filtered = useMemo(() => {
    let list = allVouchers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v => {
        const c = customerMap[v.customer_id];
        return (
          v.number?.toLowerCase().includes(q) ||
          c?.name_ar?.toLowerCase().includes(q) ||
          c?.name_en?.toLowerCase().includes(q)
        );
      });
    }
    if (trFilter) list = list.filter(v => v.treasury_id === trFilter);
    return list;
  }, [allVouchers, search, trFilter, customerMap]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("receipts.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border"
              style={{ opacity: 1 - i * 0.2 }}>
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-4 w-24 ms-auto" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("receipts.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("receipts.title")}
          subtitle={t("receipts.count", { n: allVouchers.length })}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 me-1.5" />
                {t("receipts.export")}
              </Button>
              {can("finance.receipt.create") && (
                <Button size="sm" onClick={() => setCreate(true)}>
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("receipts.new")}
                </Button>
              )}
            </div>
          }
        />

        {isOffline && <OfflineBanner />}

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-44">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("receipts.search_placeholder")}
              className="ps-9"
            />
          </div>
          <Select value={trFilter || "__all__"} onValueChange={v => setTr(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-40">
              <SelectValue placeholder={t("receipts.all_treasuries")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("receipts.all_treasuries")}</SelectItem>
              {(data?.treasuries ?? []).map(tr => (
                <SelectItem key={tr.id} value={tr.id}>
                  {lang === "ar" ? tr.name_ar : tr.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <PageSection padded={false}>
          {allVouchers.length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title={t("receipts.no_receipts")}
              description={t("receipts.empty_sub")}
              action={can("finance.receipt.create")
                ? { label: t("receipts.new"), onClick: () => setCreate(true) }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("receipts.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTr(""); }}>
                {t("receipts.clear_filters")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {["col_number","col_date","col_customer","col_treasury","col_amount","col_on_account","col_memo"].map(k => (
                    <TableHead key={k} className={cn(
                      "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                            )}>
                      {t(`receipts.${k}` as Parameters<typeof t>[0])}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(rv => {
                  const customer = customerMap[rv.customer_id];
                  const tr = trMap[rv.treasury_id];
                  const cName = customer
                    ? (lang === "ar" ? customer.name_ar : customer.name_en)
                    : rv.customer_id;
                  const trName = tr
                    ? (lang === "ar" ? tr.name_ar : tr.name_en)
                    : rv.treasury_id;
                  return (
                    <TableRow key={rv.id} className="border-b border-border last:border-0">
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                          {rv.number}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatDate(rv.date)}
                      </TableCell>
                      <TableCell>
                        <EntityCell
                          name={cName}
                          avatarFallback={cName.slice(0, 2)}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{trName}</TableCell>
                      <TableCell className="text-start tabular-nums font-medium">
                        {formatMoney(rv.amount, lang)}
                      </TableCell>
                      <TableCell>
                        {rv.on_account > 0 && (
                          <Badge variant="outline" className="text-xs text-brand border-brand/30">
                            {t("receipts.on_account_badge", { n: formatMoney(rv.on_account, lang) })}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rv.memo ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </PageSection>
      </div>

      <CreateDialog
        open={createOpen}
        onClose={() => setCreate(false)}
        data={data}
        lang={lang}
        t={t}
      />
    </>
  );
}
