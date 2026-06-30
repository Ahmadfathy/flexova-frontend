import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Play, Search, BookOpen, Bookmark } from "lucide-react";

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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ModalShell } from "@/components/patterns/ModalShell";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { useReportsData, type ReportDef } from "../data/useReportsData";

// ── Source colour ─────────────────────────────────────────────────

const SOURCE_COLOR: Record<string, string> = {
  sales:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  inventory:  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  purchasing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  accounting: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  crm:        "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  hr:         "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  eta:        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

// ── Run dialog ────────────────────────────────────────────────────

function RunDialog({
  rep, open, onClose, lang, t,
}: {
  rep: ReportDef | null;
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"reports">>["t"];
}) {
  function handleSave() {
    onClose();
    toast.success(t("library.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={rep ? (
        <span className="flex items-center gap-2">
          {lang === "ar" ? rep.name_ar : rep.name_en}
          {rep.financial && (
            <Badge variant="outline" className="text-xs font-normal">
              {t("library.financial_badge")}
            </Badge>
          )}
        </span>
      ) : ""}
      description={rep ? t("library.run_subtitle") : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إغلاق" : "Close"}</Button>
          <Button onClick={handleSave}>
            <Bookmark className="h-4 w-4 me-1.5" />
            {t("library.save_btn")}
          </Button>
        </>
      }
    >
      {rep && (
        <div className="overflow-x-auto rounded-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {rep.columns.map(col => (
                  <TableHead key={col} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {col.replace(/_/g, " ")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Sample rows — not real data */}
              {[1, 2, 3].map(i => (
                <TableRow key={i} className="border-b border-border last:border-0">
                  {rep.columns.map(col => (
                    <TableCell key={col} className="text-sm text-muted-foreground">
                      <span className="inline-block h-3 w-16 rounded bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ModalShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function ReportLibraryPage() {
  const { t, i18n } = useTranslation("reports");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useReportsData();

  const [search, setSearch]       = useState("");
  const [source, setSource]       = useState("");
  const [running, setRunning]     = useState<ReportDef | null>(null);

  const reports = data?.reportLibrary ?? [];
  const sources = [...new Set(reports.map(r => r.source))];

  const filtered = useMemo(() => {
    let list = reports;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.name_ar.toLowerCase().includes(q) || r.name_en.toLowerCase().includes(q)
      );
    }
    if (source) list = list.filter(r => r.source === source);
    return list;
  }, [reports, search, source]);

  function sourceLabel(s: string) {
    const key = `library.source_${s}` as Parameters<typeof t>[0];
    return t(key);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("library.title")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded border border-border p-5 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("library.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("library.title")}
          subtitle={t("library.count", { n: reports.length })}
        />

        {isOffline && <OfflineBanner />}

        <div className="flex flex-wrap gap-2 px-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("library.search_ph")}
              className="ps-9"
            />
          </div>
          <Select value={source || "__all__"} onValueChange={v => setSource(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-40">
              <SelectValue placeholder={t("library.all_sources")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("library.all_sources")}</SelectItem>
              {sources.map(s => (
                <SelectItem key={s} value={s}>{sourceLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <PageSection>
            <EmptyState icon={BookOpen} title={t("library.title")} description="" />
          </PageSection>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
            {filtered.map(rep => (
              <div key={rep.id} className="rounded-sm bg-card shadow-sm p-5 space-y-3 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug">
                    {lang === "ar" ? rep.name_ar : rep.name_en}
                  </h3>
                  {rep.financial && (
                    <Badge variant="outline" className="text-xs font-normal shrink-0">
                      {t("library.financial_badge")}
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "self-start inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  SOURCE_COLOR[rep.source] ?? "bg-muted text-muted-foreground",
                )}>
                  {sourceLabel(rep.source)}
                </span>
                <div className="flex flex-wrap gap-1 mt-auto pt-1">
                  {rep.columns.map(col => (
                    <span key={col} className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground font-mono">
                      {col}
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={() => setRunning(rep)}
                >
                  <Play className="h-3.5 w-3.5" />
                  {t("library.run_btn")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <RunDialog rep={running} open={running !== null} onClose={() => setRunning(null)} lang={lang} t={t} />
    </>
  );
}
