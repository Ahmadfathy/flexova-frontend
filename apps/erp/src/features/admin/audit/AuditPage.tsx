import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert, List } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatDate } from "@/lib/format";
import { cn }         from "@/lib/utils";
import { useAdminData } from "../data/useAdminData";

// ── Main page ─────────────────────────────────────────────────────

export function AuditPage() {
  const { t, i18n } = useTranslation("admin");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useAdminData();

  const [filter, setFilter] = useState<"all" | "sensitive">("all");

  const log      = data?.auditLog    ?? [];
  const users    = data?.users       ?? [];
  const branches = data?.branches    ?? [];

  const filtered = filter === "sensitive" ? log.filter(e => e.sensitive) : log;

  function userName(id: string) {
    return users.find(u => u.id === id)?.name_ar ?? id;
  }

  function branchName(id: string | null) {
    if (!id) return "—";
    const b = branches.find(br => br.id === id);
    return b ? (lang === "ar" ? b.name_ar : b.name_en) : id;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("audit.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-48 ms-auto" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("audit.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("audit.title")}
        count={t("audit.count", { n: filtered.length })}
      />

      {isOffline && <OfflineBanner />}

      <PageSection padded={false}>

        {/* Toolbar — sensitivity filter; lives inside the card, above the table */}
        <div className="px-6 py-6 border-b border-border">
          <Select value={filter} onValueChange={v => setFilter(v as "all" | "sensitive")}>
            <SelectTrigger className="h-9 w-auto min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audit.filter_all")}</SelectItem>
              <SelectItem value="sensitive">{t("audit.filter_sensitive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={List} title={t("audit.no_entries")} description={t("audit.empty_sub")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {(["col_when","col_user","col_action","col_branch","col_summary"] as const).map(k => (
                    <TableHead key={k} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(`audit.${k}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...filtered].reverse().map(entry => (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      "border-b border-border last:border-0",
                      entry.sensitive && "bg-warning/5 hover:bg-warning/10",
                    )}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(entry.when)}
                    </TableCell>
                    <TableCell className="text-sm">{userName(entry.user_id)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {entry.action}
                        </span>
                        {entry.sensitive && (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-0.5 border-warning/40 text-warning font-normal"
                          >
                            <ShieldAlert className="h-2.5 w-2.5" />
                            {t("audit.sensitive_badge")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {branchName(entry.branch_id)}
                    </TableCell>
                    <TableCell className="text-sm">{entry.summary_ar}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageSection>
    </div>
  );
}
