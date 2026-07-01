import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Download, Search, Paperclip, Loader2, ReceiptText } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";

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
  const [date, setDate]         = useState(today());
  const [categoryId, setCat]    = useState("");
  const [memo, setMemo]         = useState("");
  const [amount, setAmount]     = useState("");
  const [treasuryId, setTr]     = useState("");
  const [saving, setSaving]     = useState(false);

  const isValid = date && categoryId && parseFloat(amount) > 0 && treasuryId;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("expenses.saved_toast"));
  }

  if (!data) return null;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("expenses.form_title")}
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
          <Label className="text-xs text-muted-foreground">{t("expenses.date_label")} *</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("expenses.category_label")} *</Label>
          <Select value={categoryId} onValueChange={setCat}>
            <SelectTrigger className={cn(!categoryId && "border-muted-foreground/40")}>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {data.expenseCategories.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {lang === "ar" ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("expenses.treasury_label")} *</Label>
          <Select value={treasuryId} onValueChange={setTr}>
            <SelectTrigger className={cn(!treasuryId && "border-muted-foreground/40")}>
              <SelectValue placeholder="—" />
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
          <Label className="text-xs text-muted-foreground">{t("expenses.amount_label")} *</Label>
          <Input
            type="number" min={0.01} step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="tabular-nums text-start"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("expenses.memo_label")}</Label>
          <Input value={memo} onChange={e => setMemo(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
}

export function ExpensesPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useFinanceData();

  const [search, setSearch]     = useState("");
  const [catFilter, setCat]     = useState("");
  const [trFilter, setTr]       = useState("");
  const [createOpen, setCreate] = useState(false);

  const allExpenses = data?.expenses ?? [];

  const catMap = useMemo(
    () => Object.fromEntries((data?.expenseCategories ?? []).map(c => [c.id, c])),
    [data?.expenseCategories],
  );
  const trMap = useMemo(
    () => Object.fromEntries((data?.treasuries ?? []).map(tr => [tr.id, tr])),
    [data?.treasuries],
  );

  const filtered = useMemo(() => {
    let list = allExpenses;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.memo?.toLowerCase().includes(q));
    }
    if (catFilter) list = list.filter(e => e.category_id === catFilter);
    if (trFilter)  list = list.filter(e => e.method === trFilter);
    return list;
  }, [allExpenses, search, catFilter, trFilter]);

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("expenses.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border"
              style={{ opacity: 1 - i * 0.15 }}>
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-4 w-28 ms-auto tabular-nums" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("expenses.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("expenses.title")}
          count={t("expenses.count", { n: allExpenses.length })}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 me-1.5" />
                {t("expenses.export")}
              </Button>
              {can("finance.expense.create") && (
                <Button size="sm" onClick={() => setCreate(true)}>
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("expenses.new")}
                </Button>
              )}
            </div>
          }
        />

        {isOffline && <OfflineBanner />}

        <PageSection padded={false}>

          {/* Toolbar — search + category + treasury filters; lives inside the card, above the table */}
          <div className="px-6 py-6 border-b border-border flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-44">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("expenses.search_placeholder")}
                className="ps-9"
              />
            </div>
            <Select value={catFilter || "__all__"} onValueChange={v => setCat(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-10 w-auto min-w-36">
                <SelectValue placeholder={t("expenses.all_categories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("expenses.all_categories")}</SelectItem>
                {(data?.expenseCategories ?? []).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {lang === "ar" ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={trFilter || "__all__"} onValueChange={v => setTr(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-10 w-auto min-w-40">
                <SelectValue placeholder={t("expenses.all_treasuries")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("expenses.all_treasuries")}</SelectItem>
                {(data?.treasuries ?? []).map(tr => (
                  <SelectItem key={tr.id} value={tr.id}>
                    {lang === "ar" ? tr.name_ar : tr.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {allExpenses.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title={t("expenses.no_expenses")}
              description={t("expenses.empty_sub")}
              action={can("finance.expense.create")
                ? { label: t("expenses.new"), onClick: () => setCreate(true) }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("expenses.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCat(""); setTr(""); }}>
                {t("expenses.clear_filters")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {["col_date","col_category","col_memo","col_treasury","col_attachment","col_amount"].map(k => (
                    <TableHead key={k} className={cn(
                      "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      k === "col_amount" && "text-start",
                    )}>
                      {t(`expenses.${k}` as Parameters<typeof t>[0])}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(exp => {
                  const cat = catMap[exp.category_id];
                  const tr  = trMap[exp.method];
                  const catName = cat ? (lang === "ar" ? cat.name_ar : cat.name_en) : exp.category_id;
                  const trName  = tr  ? (lang === "ar" ? tr.name_ar  : tr.name_en)  : exp.method;
                  return (
                    <TableRow key={exp.id} className="border-b border-border last:border-0">
                      <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatDate(exp.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">{catName}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{exp.memo ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{trName}</TableCell>
                      <TableCell>
                        {exp.attachment
                          ? (
                            <span className="flex items-center gap-1 text-xs text-brand">
                              <Paperclip className="h-3 w-3" />
                              {t("expenses.has_attachment")}
                            </span>
                          )
                          : <span className="text-xs text-muted-foreground">{t("expenses.no_attachment")}</span>
                        }
                      </TableCell>
                      <TableCell className="text-start tabular-nums font-medium">
                        {formatMoney(exp.amount, lang)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Total row */}
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={5} className="text-sm font-semibold">
                    {lang === "ar" ? "الإجمالي" : "Total"}
                  </TableCell>
                  <TableCell className="text-start tabular-nums font-bold">
                    {formatMoney(totalAmount, lang)}
                  </TableCell>
                </TableRow>
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
