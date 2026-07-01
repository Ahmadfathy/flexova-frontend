import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus, Search, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, BookOpen,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Badge }     from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useCreateDispatcher } from "@/stores/createDispatcher";
import { useFinanceData, type JournalEntry } from "../data/useFinanceData";

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
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-start text-xs font-medium text-muted-foreground py-1.5 pe-4 h-auto">
                  {t("journal.lines_account")}
                </TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground py-1.5 h-auto">
                  {t("journal.lines_memo")}
                </TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground py-1.5 w-32 h-auto">
                  {t("journal.lines_dr")}
                </TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground py-1.5 w-32 h-auto">
                  {t("journal.lines_cr")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lines.map((line, i) => (
                <TableRow key={i} className="border-b border-border/50 last:border-0 hover:bg-transparent">
                  <TableCell className="py-1.5 pe-4 font-mono text-xs text-muted-foreground">{line.account}</TableCell>
                  <TableCell className="py-1.5 text-muted-foreground">{line.memo}</TableCell>
                  <TableCell className="py-1.5 text-start tabular-nums">
                    {line.dr > 0 ? formatMoney(line.dr, lang) : "—"}
                  </TableCell>
                  <TableCell className="py-1.5 text-start tabular-nums">
                    {line.cr > 0 ? formatMoney(line.cr, lang) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
  const openCreate = useCreateDispatcher(s => s.openCreate);

  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());

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
          count={t("journal.count", { n: allEntries.length })}
          actions={
            can("finance.journal.create") ? (
              <Button size="sm" onClick={() => openCreate("new_journal_entry")}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("journal.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        <PageSection padded={false}>

          {/* Toolbar — search + type filter; lives inside the card, above the table */}
          <div className="px-6 py-6 border-b border-border flex flex-wrap gap-2">
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
                          <span className="font-mono text-xs text-muted-foreground">
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
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {entry.source_ref ?? "—"}
                        </TableCell>
                        <TableCell className="text-start tabular-nums font-medium">
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
    </>
  );
}
