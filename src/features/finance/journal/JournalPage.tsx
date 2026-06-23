import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus, Search, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Loader2, BookOpen,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Badge }     from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { useFinanceData, type JournalEntry } from "../data/useFinanceData";

// ── Create dialog ──────────────────────────────────────────────────

function newLine() {
  return { _key: `${Date.now()}-${Math.random()}`, account: "", dr: "", cr: "", memo: "" };
}

function CreateDialog({
  open, onClose, lang, t,
}: {
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"finance">>["t"];
}) {
  const [date, setDate]   = useState(new Date().toISOString().split("T")[0]);
  const [memo, setMemo]   = useState("");
  const [lines, setLines] = useState([newLine(), newLine()]);
  const [saving, setSaving] = useState(false);

  const totalDr = lines.reduce((s, l) => s + (parseFloat(l.dr) || 0), 0);
  const totalCr = lines.reduce((s, l) => s + (parseFloat(l.cr) || 0), 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0;

  async function handleSave() {
    if (!balanced || !memo.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("journal.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("journal.form_title")}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!balanced || !memo.trim() || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("journal.form_date")} *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground">{t("journal.form_memo")} *</Label>
              <Input value={memo} onChange={e => setMemo(e.target.value)} />
            </div>
          </div>

          {/* Lines */}
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs w-28">{t("journal.form_account")}</TableHead>
                  <TableHead className="text-xs">{t("journal.lines_memo")}</TableHead>
                  <TableHead className="text-xs w-28 text-end">{t("journal.form_dr")}</TableHead>
                  <TableHead className="text-xs w-28 text-end">{t("journal.form_cr")}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(line => (
                  <TableRow key={line._key}>
                    <TableCell className="p-1">
                      <Input
                        className="h-8 text-xs font-mono"
                        value={line.account}
                        onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, account: e.target.value } : l))}
                        placeholder="1101"
                        dir="ltr"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        className="h-8 text-xs"
                        value={line.memo}
                        onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, memo: e.target.value } : l))}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number" min={0} step="0.01"
                        className="h-8 text-xs tabular-nums text-end"
                        value={line.dr}
                        onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, dr: e.target.value, cr: e.target.value ? "" : l.cr } : l))}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number" min={0} step="0.01"
                        className="h-8 text-xs tabular-nums text-end"
                        value={line.cr}
                        onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, cr: e.target.value, dr: e.target.value ? "" : l.dr } : l))}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="p-1 w-8">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-danger"
                        onClick={() => setLines(prev => prev.filter(l => l._key !== line._key))}
                        disabled={lines.length <= 2}
                      >×</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between px-3 py-2 border-t border-border">
              <Button
                variant="ghost" size="sm"
                className="text-xs text-muted-foreground gap-1"
                onClick={() => setLines(prev => [...prev, newLine()])}
              >
                {t("journal.form_add_line")}
              </Button>
              <div className="flex items-center gap-4 text-xs tabular-nums">
                <span className={cn(totalDr > 0 && "font-medium")}>
                  {t("journal.form_total_dr")}: {formatMoney(totalDr, lang)}
                </span>
                <span className={cn(totalCr > 0 && "font-medium")}>
                  {t("journal.form_total_cr")}: {formatMoney(totalCr, lang)}
                </span>
              </div>
            </div>
          </div>

          {!balanced && (totalDr > 0 || totalCr > 0) && (
            <p className="text-xs text-danger flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" />
              {t("journal.form_unbalanced")}
            </p>
          )}
        </div>
    </ModalShell>
  );
}

// ── Expanded lines ────────────────────────────────────────────────

function EntryLines({
  entry, lang, t,
}: {
  entry: JournalEntry;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"finance">>["t"];
}) {
  return (
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      <TableCell colSpan={8} className="p-0 border-0">
        <div className="px-8 pb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-start text-xs font-medium text-muted-foreground py-1.5 pe-4">
                  {t("journal.lines_account")}
                </th>
                <th className="text-start text-xs font-medium text-muted-foreground py-1.5">
                  {t("journal.lines_memo")}
                </th>
                <th className="text-end text-xs font-medium text-muted-foreground py-1.5 w-32">
                  {t("journal.lines_dr")}
                </th>
                <th className="text-end text-xs font-medium text-muted-foreground py-1.5 w-32">
                  {t("journal.lines_cr")}
                </th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((line, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 pe-4 font-mono text-xs text-muted-foreground">{line.account}</td>
                  <td className="py-1.5 text-muted-foreground">{line.memo}</td>
                  <td className="py-1.5 text-end tabular-nums">
                    {line.dr > 0 ? formatMoney(line.dr, lang) : "—"}
                  </td>
                  <td className="py-1.5 text-end tabular-nums">
                    {line.cr > 0 ? formatMoney(line.cr, lang) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function JournalPage() {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useFinanceData();

  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [createOpen, setCreate]     = useState(false);

  const allEntries = data?.journalEntries ?? [];

  const filtered = useMemo(() => {
    let list = allEntries;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.number.toLowerCase().includes(q) ||
        e.memo.toLowerCase().includes(q) ||
        (e.source_ref ?? "").toLowerCase().includes(q)
      );
    }
    if (typeFilter) list = list.filter(e => e.type === typeFilter);
    return list;
  }, [allEntries, search, typeFilter]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("journal.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border"
              style={{ opacity: 1 - i * 0.15 }}>
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-24 font-mono" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
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
        <PageHeader title={t("journal.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("journal.title")}
          subtitle={t("journal.count", { n: allEntries.length })}
          actions={
            can("finance.journal.create") ? (
              <Button size="sm" onClick={() => setCreate(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("journal.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-44">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("journal.search_ph")}
              className="ps-9"
            />
          </div>
          <Select value={typeFilter || "__all__"} onValueChange={v => setTypeFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36">
              <SelectValue placeholder={t("journal.all_types")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("journal.all_types")}</SelectItem>
              <SelectItem value="auto">{t("journal.type_auto")}</SelectItem>
              <SelectItem value="manual">{t("journal.type_manual")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PageSection padded={false}>
          {allEntries.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={t("journal.no_entries")}
              description={t("journal.empty_sub")}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("journal.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTypeFilter(""); }}>
                {t("journal.clear_filters")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-8" />
                  {["col_number","col_date","col_type","col_memo","col_source","col_amount","col_balanced"].map(k => (
                    <TableHead key={k} className={cn(
                      "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      k === "col_amount" && "text-end",
                    )}>
                      {t(`journal.${k}` as Parameters<typeof t>[0])}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(entry => {
                  const isOpen = expanded.has(entry.id);
                  const ChevronIcon = isOpen ? ChevronDown : ChevronRight;
                  return (
                    <>
                      <TableRow
                        key={entry.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <TableCell className="w-8">
                          <ChevronIcon className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                            {entry.number}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={entry.type === "manual" ? "default" : "outline"}
                            className="text-xs font-normal"
                          >
                            {t(entry.type === "manual" ? "journal.type_manual" : "journal.type_auto")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{entry.memo}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                          {entry.source_ref ?? "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums font-medium">
                          {formatMoney(entry.total_dr, lang)}
                        </TableCell>
                        <TableCell>
                          {entry.balanced
                            ? <CheckCircle2 className="h-4 w-4 text-success" />
                            : <XCircle className="h-4 w-4 text-danger" />
                          }
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <EntryLines key={`${entry.id}-lines`} entry={entry} lang={lang} t={t} />
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </PageSection>
      </div>

      <CreateDialog open={createOpen} onClose={() => setCreate(false)} lang={lang} t={t} />
    </>
  );
}
