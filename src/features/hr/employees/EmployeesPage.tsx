import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, Loader2, Users } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { EntityCell }    from "@/components/patterns/DataTable";
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
import { DrawerShell } from "@/components/patterns/DrawerShell";
import { ModalShell }  from "@/components/patterns/ModalShell";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useHrData, type Employee } from "../data/useHrData";

// ── Employment type badge ─────────────────────────────────────────

function TypeBadge({ type, t }: { type: Employee["employment_type"]; t: ReturnType<typeof useTranslation<"hr">>["t"] }) {
  const color = type === "monthly" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    : type === "daily"   ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", color)}>
      {t(`employees.type_${type}` as Parameters<typeof t>[0])}
    </span>
  );
}

// ── Employee Sheet ────────────────────────────────────────────────

function EmployeeSheet({
  emp, open, onClose, lang, t,
}: {
  emp: Employee | null;
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"hr">>["t"];
}) {
  const name = emp ? (lang === "ar" ? emp.name_ar : emp.name_en) : "";
  const ss   = emp?.salary_structure;

  return (
    <DrawerShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={name}
      description={emp?.title}
      size="md"
    >
      {emp && (
        <div className="space-y-5">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("employees.card_type")}</p>
              <TypeBadge type={emp.employment_type} t={t} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("employees.card_phone")}</p>
              <p dir="ltr">{emp.phone}</p>
            </div>
          </div>

          <Separator />

          {/* Salary structure */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">{t("employees.card_structure")}</p>
            <div className="space-y-2">
              {ss?.base !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("employees.card_base")}</span>
                  <span className="tabular-nums font-medium">{formatMoney(ss.base!, lang)}</span>
                </div>
              )}
              {ss?.day_rate !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("employees.card_day_rate")}</span>
                  <span className="tabular-nums font-medium">{formatMoney(ss.day_rate!, lang)}</span>
                </div>
              )}
              {(ss?.components ?? []).map((comp, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{comp.name_ar}</span>
                  <span className={cn(
                    "tabular-nums font-medium",
                    comp.kind === "deduction" ? "text-danger" : "text-success",
                  )}>
                    {comp.kind === "deduction" ? "-" : "+"}{formatMoney(comp.amount, lang)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Advance balance */}
          {emp.advance_balance > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("employees.card_advance")}</span>
                <span className="tabular-nums font-medium text-warning">
                  {formatMoney(emp.advance_balance, lang)}
                </span>
              </div>
            </>
          )}

          {/* Flag */}
          {emp._flag === "missing_attendance" && (
            <div className="flex items-center gap-2 rounded border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {t("employees.flag_missing_att")}
            </div>
          )}
        </div>
      )}
    </DrawerShell>
  );
}

// ── Create dialog ─────────────────────────────────────────────────

function CreateDialog({
  open, onClose, lang, t,
}: {
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"hr">>["t"];
}) {
  const [empType, setEmpType] = useState<Employee["employment_type"]>("monthly");
  const [nameAr, setNameAr]   = useState("");
  const [nameEn, setNameEn]   = useState("");
  const [phone, setPhone]     = useState("");
  const [title, setTitle]     = useState("");
  const [base, setBase]       = useState("");
  const [saving, setSaving]   = useState(false);

  const isValid = nameAr.trim() && nameEn.trim() && title.trim();

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("employees.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("employees.form_title_new")}
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
          <Label className="text-xs text-muted-foreground">{t("employees.form_name_ar")} *</Label>
          <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("employees.form_name_en")} *</Label>
          <Input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("employees.form_title_f")} *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("employees.form_phone")}</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" type="tel" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("employees.form_emp_type")} *</Label>
          <Select value={empType} onValueChange={v => setEmpType(v as Employee["employment_type"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{t("employees.type_monthly")}</SelectItem>
              <SelectItem value="daily">{t("employees.type_daily")}</SelectItem>
              <SelectItem value="commission">{t("employees.type_commission")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {empType !== "commission" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {empType === "daily" ? t("employees.form_day_rate") : t("employees.form_base")}
            </Label>
            <Input
              type="number" min={0} value={base}
              onChange={e => setBase(e.target.value)}
              className="tabular-nums text-start"
              placeholder="0"
            />
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function EmployeesPage() {
  const { t, i18n } = useTranslation("hr");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useHrData();

  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected]     = useState<Employee | null>(null);
  const [createOpen, setCreate]     = useState(false);

  const employees = data?.employees ?? [];

  const filtered = useMemo(() => {
    let list = employees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name_ar.toLowerCase().includes(q) ||
        e.name_en.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q)
      );
    }
    if (typeFilter) list = list.filter(e => e.employment_type === typeFilter);
    return list;
  }, [employees, search, typeFilter]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("employees.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border" style={{ opacity: 1 - i * 0.15 }}>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-24 tabular-nums" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("employees.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("employees.title")}
          subtitle={t("employees.count", { n: employees.length })}
          actions={
            can("hr.employee.create") ? (
              <Button size="sm" onClick={() => setCreate(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("employees.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("employees.search_ph")}
              className="ps-9"
            />
          </div>
          <Select value={typeFilter || "__all__"} onValueChange={v => setTypeFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36">
              <SelectValue placeholder={t("employees.all_types")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("employees.all_types")}</SelectItem>
              <SelectItem value="monthly">{t("employees.type_monthly")}</SelectItem>
              <SelectItem value="daily">{t("employees.type_daily")}</SelectItem>
              <SelectItem value="commission">{t("employees.type_commission")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PageSection padded={false}>
          {employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t("employees.no_employees")}
              description={t("employees.empty_sub")}
              action={can("hr.employee.create")
                ? { label: t("employees.new"), onClick: () => setCreate(true) }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("employees.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTypeFilter(""); }}>
                {t("employees.clear_filters")}
              </Button>
            </div>
          ) : (
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {["col_name","col_type","col_title","col_base","col_advance"].map(k => (
                      <TableHead key={k} className={cn(
                        "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      )}>
                        {t(`employees.${k}` as Parameters<typeof t>[0])}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(emp => {
                    const name = lang === "ar" ? emp.name_ar : emp.name_en;
                    const base = emp.salary_structure.base ?? emp.salary_structure.day_rate ?? 0;
                    return (
                      <TableRow
                        key={emp.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelected(emp)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EntityCell name={name} avatarFallback={name.slice(0, 2)} />
                            {emp._flag === "missing_attendance" && (
                              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell><TypeBadge type={emp.employment_type} t={t} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.title}</TableCell>
                        <TableCell className="text-start tabular-nums text-sm font-medium">
                          {formatMoney(base, lang)}
                        </TableCell>
                        <TableCell className="text-start tabular-nums text-sm">
                          {emp.advance_balance > 0 ? (
                            <span className="text-warning font-medium">{formatMoney(emp.advance_balance, lang)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Mobile */}
          {filtered.length > 0 && (
            <div className="md:hidden divide-y divide-border">
              {filtered.map(emp => {
                const name = lang === "ar" ? emp.name_ar : emp.name_en;
                const base = emp.salary_structure.base ?? emp.salary_structure.day_rate ?? 0;
                return (
                  <div key={emp.id} className="px-4 py-3 space-y-1 hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(emp)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{name}</span>
                      <TypeBadge type={emp.employment_type} t={t} />
                    </div>
                    <p className="text-xs text-muted-foreground">{emp.title}</p>
                    <p className="tabular-nums text-sm">{formatMoney(base, lang)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </PageSection>
      </div>

      <EmployeeSheet emp={selected} open={selected !== null} onClose={() => setSelected(null)} lang={lang} t={t} />
      <CreateDialog open={createOpen} onClose={() => setCreate(false)} lang={lang} t={t} />
    </>
  );
}
