import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { useHrData } from "../data/useHrData";

// Months available (from fixture period + current)
const PERIODS = ["2026-06", "2026-05", "2026-04"];

export function AttendancePage() {
  const { t, i18n } = useTranslation("hr");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useHrData();

  const [period, setPeriod] = useState("2026-06");

  const attendance = data?.attendance;
  const employees  = data?.employees ?? [];
  const summary    = attendance?.period === period ? (attendance.summary ?? []) : [];

  function empName(id: string) {
    const e = employees.find(emp => emp.id === id);
    if (!e) return id;
    return lang === "ar" ? e.name_ar : e.name_en;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("attendance.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border" style={{ opacity: 1 - i * 0.2 }}>
              <Skeleton className="h-3.5 w-28" />
              {Array.from({ length: 5 }).map((__, j) => (
                <Skeleton key={j} className="h-3.5 w-10 ms-auto" />
              ))}
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("attendance.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("attendance.title")}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success(t("attendance.imported_toast"))}
          >
            <Upload className="h-4 w-4 me-1.5" />
            {t("attendance.import_btn")}
          </Button>
        }
      />

      {isOffline && <OfflineBanner />}

      {/* Period selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground shrink-0">{t("attendance.period_label")}:</Label>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => (
              <SelectItem key={p} value={p}>
                <span dir="ltr">{p}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PageSection padded={false}>
        {summary.length === 0 ? (
          <EmptyState title={t("attendance.no_data")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {[
                    { key: "col_employee", align: "start" },
                    { key: "col_present",  align: "center" },
                    { key: "col_absent",   align: "center" },
                    { key: "col_leave",    align: "center" },
                    { key: "col_overtime", align: "center" },
                    { key: "col_late",     align: "center" },
                  ].map(({ key, align }) => (
                    <TableHead key={key} className={cn(
                      "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      align === "center" && "text-center",
                    )}>
                      {t(`attendance.${key}` as Parameters<typeof t>[0])}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map(row => (
                  <TableRow key={row.employee_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">{empName(row.employee_id)}</TableCell>
                    <TableCell className="text-center tabular-nums text-sm">
                      <span className="text-success font-medium">{row.present}</span>
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm">
                      {row.absent > 0
                        ? <span className="text-danger font-medium">{row.absent}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm">
                      {row.leave > 0
                        ? <span className="text-blue-500 font-medium">{row.leave}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm">
                      {row.overtime_hours > 0
                        ? <span className="text-purple-500 font-medium">{row.overtime_hours}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm">
                      {row.late > 0
                        ? <span className="text-warning font-medium">{row.late}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
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
