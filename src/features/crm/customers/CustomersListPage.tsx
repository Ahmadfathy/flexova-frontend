import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus, Download, Search, Building2, User, AlertTriangle,
  Phone, MapPin, Clock, Loader2, Users,
} from "lucide-react";

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
import { Switch } from "@/components/ui/switch";

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useCrmData, type CrmCustomer } from "../data/useCrmData";

// ── Aging bar ─────────────────────────────────────────────────────

function AgingBar({
  aging, lang, t,
}: {
  aging: NonNullable<CrmCustomer["aging"]>;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"crm">>["t"];
}) {
  const total = aging.current + aging.d1_30 + aging.d31_60 + aging.d60_plus;
  if (total === 0) return null;

  const segments = [
    { key: "aging_current", value: aging.current,  color: "bg-success" },
    { key: "aging_1_30",    value: aging.d1_30,    color: "bg-warning" },
    { key: "aging_31_60",   value: aging.d31_60,   color: "bg-orange-500" },
    { key: "aging_60_plus", value: aging.d60_plus, color: "bg-danger" },
  ] as const;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t("card.aging_title")}</p>
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {segments.map(s => s.value > 0 && (
          <div
            key={s.key}
            className={cn("h-full", s.color)}
            style={{ width: `${(s.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {segments.map(s => s.value > 0 && (
          <div key={s.key} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t(`card.${s.key}` as Parameters<typeof t>[0])}</span>
            <span className="tabular-nums font-medium">{formatMoney(s.value, lang)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Customer Sheet ────────────────────────────────────────────────

function CustomerSheet({
  customer, segments, open, onClose, lang, t,
}: {
  customer: CrmCustomer | null;
  segments: ReturnType<typeof useCrmData>["data"] extends null ? [] : NonNullable<ReturnType<typeof useCrmData>["data"]>["segments"];
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"crm">>["t"];
}) {
  const name = customer ? (lang === "ar" ? customer.name_ar : customer.name_en) : "";
  const creditPct = customer && customer.credit_limit > 0
    ? Math.min(Math.round((customer.ar_balance / customer.credit_limit) * 100), 999)
    : 0;
  const overLimit = customer
    ? customer.credit_limit > 0 && customer.ar_balance > customer.credit_limit
    : false;

  return (
    <DrawerShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={customer ? (
        <span className="flex items-center gap-2">
          {customer.type === "company"
            ? <Building2 className="h-4 w-4 text-muted-foreground" />
            : <User className="h-4 w-4 text-muted-foreground" />
          }
          {name}
        </span>
      ) : ""}
      description={customer?.phone ? (
        <span className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          <span dir="ltr">{customer.phone}</span>
        </span>
      ) : undefined}
      size="md"
    >
      {customer && (
        <div className="space-y-5">
          {/* AR balance + credit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">{t("card.ar_balance")}</p>
              <p className={cn(
                "text-lg font-bold tabular-nums",
                customer.ar_balance > 0 ? "text-danger" : "text-success",
              )}>
                {formatMoney(customer.ar_balance, lang)}
              </p>
              {customer.oldest_overdue_days > 0 && (
                <p className="text-xs text-danger mt-0.5">
                  {t("list.overdue_badge", { n: customer.oldest_overdue_days })}
                </p>
              )}
            </div>
            <div className="rounded border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">{t("card.credit_limit")}</p>
              {customer.credit_limit > 0 ? (
                <>
                  <p className="text-lg font-bold tabular-nums">{formatMoney(customer.credit_limit, lang)}</p>
                  <p className={cn("text-xs mt-0.5", overLimit ? "text-danger font-medium" : "text-muted-foreground")}>
                    {overLimit ? t("card.over_limit") : t("card.credit_used", { pct: creditPct })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          </div>

          {/* Aging */}
          {customer.aging && (
            <AgingBar aging={customer.aging} lang={lang} t={t} />
          )}

          <Separator />

          {/* Segments */}
          {customer.segments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("card.segments")}</p>
              <div className="flex flex-wrap gap-1.5">
                {customer.segments.map(segId => {
                  const seg = (segments as any[]).find((s: any) => s.id === segId);
                  const segName = seg ? (lang === "ar" ? seg.name_ar : seg.name_en) : segId;
                  return (
                    <Badge key={segId} variant="secondary" className="text-xs">
                      {segName}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contacts */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("card.contacts")}</p>
            {customer.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("card.no_contacts")}</p>
            ) : (
              <div className="space-y-2">
                {customer.contacts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.role}</p>
                    </div>
                    <span className="text-muted-foreground text-xs" dir="ltr">{c.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Address */}
          {customer.address && (customer.address.gov || customer.address.area) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{t("card.address")}</p>
              <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {[customer.address.street, customer.address.area, customer.address.gov]
                  .filter(Boolean).join("، ")}
              </p>
            </div>
          )}

          {/* TRN / National ID */}
          {(customer.trn || customer.national_id) && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {customer.trn && (
                <div>
                  <p className="text-xs text-muted-foreground">TRN</p>
                  <p className="font-mono">{customer.trn}</p>
                </div>
              )}
              {customer.national_id && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("list.form_national_id")}</p>
                  <p className="font-mono text-xs">{customer.national_id}</p>
                </div>
              )}
            </div>
          )}

          {/* Last activity */}
          {customer.last_activity && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t("card.last_activity")}: {formatDate(customer.last_activity)}
            </p>
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
  t: ReturnType<typeof useTranslation<"crm">>["t"];
}) {
  const [type, setType]     = useState<"company" | "individual">("company");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [phone, setPhone]   = useState("");
  const [trn, setTrn]       = useState("");
  const [limit, setLimit]   = useState("");
  const [saving, setSaving] = useState(false);

  const isValid = nameAr.trim() && nameEn.trim();

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("list.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("list.form_title_new")}
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
          <Label className="text-xs text-muted-foreground">{t("list.form_type")} *</Label>
          <Select value={type} onValueChange={v => setType(v as "company" | "individual")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="company">{t("list.type_company")}</SelectItem>
              <SelectItem value="individual">{t("list.type_individual")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("list.form_name_ar")} *</Label>
          <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("list.form_name_en")} *</Label>
          <Input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("list.form_phone")}</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" type="tel" />
        </div>
        {type === "company" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("list.form_trn")}</Label>
            <Input value={trn} onChange={e => setTrn(e.target.value)} dir="ltr" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("list.form_credit_limit")}</Label>
          <Input
            type="number" min={0} step="100"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            className="tabular-nums text-start"
            placeholder="0"
          />
        </div>
      </div>
    </ModalShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function CustomersListPage() {
  const { t, i18n } = useTranslation("crm");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useCrmData();

  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [segFilter, setSegFilter]   = useState("");
  const [balanceOnly, setBalOnly]   = useState(false);
  const [selected, setSelected]     = useState<CrmCustomer | null>(null);
  const [createOpen, setCreate]     = useState(false);

  const allCustomers = (data?.customers ?? []).filter(c => !c.is_walkin);

  const filtered = useMemo(() => {
    let list = allCustomers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name_ar.toLowerCase().includes(q) ||
        c.name_en.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.trn ?? "").includes(q)
      );
    }
    if (typeFilter) list = list.filter(c => c.type === typeFilter);
    if (segFilter)  list = list.filter(c => c.segments.includes(segFilter));
    if (balanceOnly) list = list.filter(c => c.ar_balance > 0);
    return list;
  }, [allCustomers, search, typeFilter, segFilter, balanceOnly]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("list.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border"
              style={{ opacity: 1 - i * 0.13 }}>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3.5 w-24 ms-auto tabular-nums" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("list.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("list.title")}
          subtitle={t("list.count", { n: allCustomers.length })}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 me-1.5" />
                {t("list.export")}
              </Button>
              {can("crm.customer.create") && (
                <Button size="sm" onClick={() => setCreate(true)}>
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("list.new")}
                </Button>
              )}
            </div>
          }
        />

        {isOffline && <OfflineBanner />}

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("list.search_ph")}
              className="ps-9"
            />
          </div>
          <Select value={typeFilter || "__all__"} onValueChange={v => setTypeFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-36">
              <SelectValue placeholder={t("list.all_types")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("list.all_types")}</SelectItem>
              <SelectItem value="company">{t("list.type_company")}</SelectItem>
              <SelectItem value="individual">{t("list.type_individual")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={segFilter || "__all__"} onValueChange={v => setSegFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-10 w-auto min-w-40">
              <SelectValue placeholder={t("list.all_segments")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("list.all_segments")}</SelectItem>
              {(data?.segments ?? []).map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {lang === "ar" ? s.name_ar : s.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Switch checked={balanceOnly} onCheckedChange={setBalOnly} />
            {t("list.with_balance")}
          </label>
        </div>

        <PageSection padded={false}>
          {allCustomers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t("list.no_customers")}
              description={t("list.empty_sub")}
              action={can("crm.customer.create")
                ? { label: t("list.new"), onClick: () => setCreate(true) }
                : undefined}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <p className="text-sm text-muted-foreground">{t("list.no_results")}</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTypeFilter(""); setSegFilter(""); setBalOnly(false); }}>
                {t("list.clear_filters")}
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      {["col_name","col_type","col_phone","col_segment","col_balance","col_last_activity"].map(k => (
                        <TableHead key={k} className={cn(
                          "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                        )}>
                          {t(`list.${k}` as Parameters<typeof t>[0])}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => {
                      const name = lang === "ar" ? c.name_ar : c.name_en;
                      const overLimit = c.credit_limit > 0 && c.ar_balance > c.credit_limit;
                      const segs = c.segments.map(sid => {
                        const s = (data?.segments ?? []).find(sg => sg.id === sid);
                        return s ? (lang === "ar" ? s.name_ar : s.name_en) : sid;
                      });
                      return (
                        <TableRow
                          key={c.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => setSelected(c)}
                        >
                          <TableCell>
                            <EntityCell
                              name={name}
                              sub={c.trn || c.national_id || undefined}
                              avatarFallback={name.slice(0, 2)}
                              flag={c._flag}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-normal gap-1">
                              {c.type === "company"
                                ? <Building2 className="h-3 w-3" />
                                : <User className="h-3 w-3" />
                              }
                              {t(c.type === "company" ? "list.type_company" : "list.type_individual")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.phone ? <span dir="ltr">{c.phone}</span> : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {segs.map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-0.5">
                              <span className={cn(
                                "tabular-nums font-medium text-sm",
                                c.ar_balance > 0 ? "text-danger" : "text-muted-foreground",
                              )}>
                                {formatMoney(c.ar_balance, lang)}
                              </span>
                              {c.oldest_overdue_days > 0 && (
                                <span className="text-xs text-danger flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t("list.overdue_badge", { n: c.oldest_overdue_days })}
                                </span>
                              )}
                              {overLimit && (
                                <span className="text-xs text-danger">{t("list.over_limit_badge")}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground tabular-nums">
                            {c.last_activity ? formatDate(c.last_activity) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map(c => {
                  const name = lang === "ar" ? c.name_ar : c.name_en;
                  return (
                    <div
                      key={c.id}
                      className="px-4 py-3 space-y-1.5 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelected(c)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{name}</span>
                        {c.ar_balance > 0 && (
                          <span className="tabular-nums text-sm font-medium text-danger">
                            {formatMoney(c.ar_balance, lang)}
                          </span>
                        )}
                      </div>
                      {c.phone && (
                        <p className="text-xs text-muted-foreground" dir="ltr">{c.phone}</p>
                      )}
                      {c.oldest_overdue_days > 0 && (
                        <p className="text-xs text-danger flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t("list.overdue_badge", { n: c.oldest_overdue_days })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </PageSection>
      </div>

      <CustomerSheet
        customer={selected}
        segments={data?.segments ?? []}
        open={selected !== null}
        onClose={() => setSelected(null)}
        lang={lang}
        t={t}
      />

      <CreateDialog open={createOpen} onClose={() => setCreate(false)} lang={lang} t={t} />
    </>
  );
}
