import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, ArrowRight, ArrowLeft, Loader2, ArrowLeftRight } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { DatePicker }    from "@/components/patterns/DatePicker";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
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
  const [from, setFrom]       = useState("");
  const [to, setTo]           = useState("");
  const [amount, setAmount]   = useState("");
  const [date, setDate]       = useState(today());
  const [memo, setMemo]       = useState("");
  const [saving, setSaving]   = useState(false);

  const sameError = from && to && from === to;
  const isValid   = from && to && !sameError && parseFloat(amount) > 0 && date;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("transfers.saved_toast"));
  }

  if (!data) return null;

  const ArrowIcon = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("transfers.form_title")}
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
          <Label className="text-xs text-muted-foreground">{t("transfers.from_label")} *</Label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className={cn(!from && "border-muted-foreground/40")}>
              <SelectValue placeholder={t("transfers.from_ph")} />
            </SelectTrigger>
            <SelectContent>
              {data.treasuries.map(tr => (
                <SelectItem key={tr.id} value={tr.id} disabled={tr.id === to}>
                  {lang === "ar" ? tr.name_ar : tr.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-center">
          <ArrowIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("transfers.to_label")} *</Label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className={cn(!to && "border-muted-foreground/40", sameError && "border-danger")}>
              <SelectValue placeholder={t("transfers.to_ph")} />
            </SelectTrigger>
            <SelectContent>
              {data.treasuries.map(tr => (
                <SelectItem key={tr.id} value={tr.id} disabled={tr.id === from}>
                  {lang === "ar" ? tr.name_ar : tr.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sameError && (
            <p className="text-xs text-danger">{t("transfers.same_treasury")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("transfers.amount_label")} *</Label>
          <Input
            type="number" min={0.01} step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="tabular-nums text-start"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("transfers.date_label")} *</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("transfers.memo_label")}</Label>
          <Input value={memo} onChange={e => setMemo(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
}

export function TransfersPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const [searchParams] = useSearchParams();
  const { data, loading, error, isOffline, reload } = useFinanceData();
  const [createOpen, setCreate] = useState(searchParams.get("new") === "1");

  const allTransfers = data?.transfers ?? [];

  const trMap = useMemo(
    () => Object.fromEntries((data?.treasuries ?? []).map(tr => [tr.id, tr])),
    [data?.treasuries],
  );

  const ArrowIcon = lang === "ar" ? ArrowLeft : ArrowRight;

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("transfers.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border"
              style={{ opacity: 1 - i * 0.25 }}>
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-28" />
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
        <PageHeader title={t("transfers.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("transfers.title")}
          count={t("transfers.count", { n: allTransfers.length })}
          actions={
            can("finance.transfer.create") ? (
              <Button size="sm" onClick={() => setCreate(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("transfers.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        <PageSection padded={false}>
          {allTransfers.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title={t("transfers.no_transfers")}
              description={t("transfers.empty_sub")}
              action={can("finance.transfer.create")
                ? { label: t("transfers.new"), onClick: () => setCreate(true) }
                : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {["col_number","col_date","col_from","col_to","col_amount","col_memo"].map(k => (
                    <TableHead key={k} className={cn(
                      "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                            )}>
                      {t(`transfers.${k}` as Parameters<typeof t>[0])}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTransfers.map(tf => {
                  const fromTr = trMap[tf.from];
                  const toTr   = trMap[tf.to];
                  const fromName = fromTr ? (lang === "ar" ? fromTr.name_ar : fromTr.name_en) : tf.from;
                  const toName   = toTr   ? (lang === "ar" ? toTr.name_ar   : toTr.name_en)   : tf.to;
                  return (
                    <TableRow key={tf.id} className="border-b border-border last:border-0">
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {tf.number}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatDate(tf.date)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{fromName}</TableCell>
                      <TableCell>
                        <ArrowIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{toName}</TableCell>
                      <TableCell className="text-start tabular-nums font-medium">
                        {formatMoney(tf.amount, lang)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tf.memo ?? "—"}</TableCell>
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
