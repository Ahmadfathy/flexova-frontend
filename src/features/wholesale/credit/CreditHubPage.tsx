import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle, Clock3, Lock, Snowflake, Unlock, PencilLine, UserPlus,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useWholesaleAudit } from "@/stores/wholesaleAudit";
import {
  getCustomers, getCreditReservations, getAgingBuckets, getOrder, getRoutes, getReps,
} from "@/lib/mock/wholesale";
import { getAvailableCredit, getOpenReservations } from "@/lib/wholesale/credit";
import type { WholesaleCustomer, CreditPolicy } from "@/types/wholesale";

type TabKey = "over_limit" | "aging" | "reservations";

const POLICY_PILL: Record<CreditPolicy, PillVariant> = {
  warn: "pending",
  block: "rejected",
  override: "active",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function CreditHubPage() {
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const can = useCan();
  const appendAudit = useWholesaleAudit((s) => s.append);

  const customers = useMemo(() => getCustomers(), []);
  const reservations = useMemo(() => getCreditReservations(), []);
  const agingBuckets = useMemo(() => getAgingBuckets(), []);
  const routes = useMemo(() => getRoutes(), []);
  const reps = useMemo(() => getReps(), []);

  const [tab, setTab] = useState<TabKey>("over_limit");
  const [limitOverrides, setLimitOverrides] = useState<Record<string, number>>({});
  const [frozen, setFrozen] = useState<Set<string>>(new Set());
  const [releasedIds, setReleasedIds] = useState<Set<string>>(new Set());
  const [editLimitTarget, setEditLimitTarget] = useState<WholesaleCustomer | null>(null);
  const [limitInput, setLimitInput] = useState("");

  const canEditLimit = can("crm.credit.limit.manage");

  function effectiveCustomer(c: WholesaleCustomer): WholesaleCustomer {
    const limit = limitOverrides[c.id] ?? c.credit_limit;
    return limit === c.credit_limit ? c : { ...c, credit_limit: limit };
  }

  const overLimitRows = useMemo(
    () => customers
      .map((c) => effectiveCustomer(c))
      .filter((c) => getAvailableCredit(c, reservations) < 0),
    [customers, reservations, limitOverrides],
  );

  function toggleFreeze(customer: WholesaleCustomer) {
    const name = lang === "ar" ? customer.name_ar : customer.name_en;
    setFrozen((prev) => {
      const next = new Set(prev);
      if (next.has(customer.id)) {
        next.delete(customer.id);
        toast.success(t("credit.unfreeze_success", { customer: name }));
      } else {
        next.add(customer.id);
        toast.success(t("credit.freeze_success", { customer: name }));
      }
      return next;
    });
  }

  function openEditLimit(customer: WholesaleCustomer) {
    setEditLimitTarget(customer);
    setLimitInput(String(limitOverrides[customer.id] ?? customer.credit_limit));
  }

  function saveEditLimit() {
    if (!editLimitTarget) return;
    const oldLimit = limitOverrides[editLimitTarget.id] ?? editLimitTarget.credit_limit;
    const newLimit = parseFloat(limitInput);
    if (isNaN(newLimit) || newLimit < 0) return;

    setLimitOverrides((prev) => ({ ...prev, [editLimitTarget.id]: newLimit }));
    appendAudit({
      user: "u_dev",
      action: "crm.credit.limit.manage",
      entity: editLimitTarget.id,
      detail_ar: t("credit.audit_limit_ar", { name: editLimitTarget.name_ar, old: formatMoney(oldLimit, "ar"), new: formatMoney(newLimit, "ar") }),
      detail_en: t("credit.audit_limit_en", { name: editLimitTarget.name_en, old: formatMoney(oldLimit, "en"), new: formatMoney(newLimit, "en") }),
    });
    toast.success(t("credit.edit_limit_success"));
    setEditLimitTarget(null);
  }

  function assignCollection(customer: WholesaleCustomer) {
    const route = routes.find((r) => r.id === customer.route_id);
    const rep = route ? reps.find((r) => r.id === route.rep_id) : undefined;
    const repName = rep ? (lang === "ar" ? rep.name_ar : rep.name_en) : "—";
    const customerName = lang === "ar" ? customer.name_ar : customer.name_en;
    toast.success(t("credit.assign_collection_success", { rep: repName, customer: customerName }));
  }

  function releaseReservation(reservationId: string) {
    setReleasedIds((prev) => new Set(prev).add(reservationId));
  }

  const openReservationRows = useMemo(
    () => reservations
      .filter((r) => r.status === "reserved" && !releasedIds.has(r.id))
      .map((r) => {
        const customer = customers.find((c) => c.id === r.customer_id);
        const order = getOrder(r.order_id);
        const ageDays = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
        return { reservation: r, customer, order, ageDays };
      }),
    [reservations, releasedIds, customers],
  );

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={t("credit.title")} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="h-11 p-1 bg-muted gap-1">
          <TabsTrigger value="over_limit" className="h-9 px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <AlertTriangle className="h-4 w-4" /> {t("credit.tab_over_limit")}
          </TabsTrigger>
          <TabsTrigger value="aging" className="h-9 px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Clock3 className="h-4 w-4" /> {t("credit.tab_aging")}
          </TabsTrigger>
          <TabsTrigger value="reservations" className="h-9 px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Lock className="h-4 w-4" /> {t("credit.tab_reservations")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "over_limit" && (
        <PageSection padded={false}>
          {overLimitRows.length === 0 ? (
            <EmptyState icon={AlertTriangle} title={t("credit.no_over_limit")} description="" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs">{t("credit.col_customer")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_limit")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_ar_balance")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_reserved")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_excess")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_policy")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overLimitRows.map((c) => {
                  const original = customers.find((oc) => oc.id === c.id)!;
                  const reserved = round2(getOpenReservations(c.id, reservations).reduce((s, r) => s + r.amount, 0));
                  const excess = round2(-(getAvailableCredit(c, reservations)));
                  const isFrozen = frozen.has(c.id);
                  const name = lang === "ar" ? c.name_ar : c.name_en;
                  return (
                    <TableRow key={c.id} className="border-b border-border last:border-0">
                      <TableCell className="text-sm font-medium">
                        {name}
                        {isFrozen && <Badge variant="outline" className="ms-2 text-[10px] text-danger-text border-danger/30">{t("credit.frozen_badge")}</Badge>}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{formatMoney(c.credit_limit, lang)}</TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground">{formatMoney(original.ar_balance, lang)}</TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground">{formatMoney(reserved, lang)}</TableCell>
                      <TableCell className="tabular-nums text-sm font-medium text-danger-text">{formatMoney(excess, lang)}</TableCell>
                      <TableCell>
                        <StatusPill variant={POLICY_PILL[c.credit_policy]} label={t(`credit.policy_${c.credit_policy}`)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title={isFrozen ? t("credit.action_unfreeze") : t("credit.action_freeze")} onClick={() => toggleFreeze(c)}>
                            {isFrozen ? <Unlock className="h-3.5 w-3.5" /> : <Snowflake className="h-3.5 w-3.5" />}
                          </Button>
                          {canEditLimit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={t("credit.action_edit_limit")} onClick={() => openEditLimit(c)}>
                              <PencilLine className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title={t("credit.action_assign_collection")} onClick={() => assignCollection(c)}>
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </PageSection>
      )}

      {tab === "aging" && (
        <PageSection padded={false}>
          {agingBuckets.length === 0 ? (
            <EmptyState icon={Clock3} title={t("credit.no_aging")} description="" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs">{t("credit.col_customer")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_bucket_current")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_bucket_1_30")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_bucket_31_60")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_bucket_60_plus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingBuckets.map((b) => {
                  const customer = customers.find((c) => c.id === b.customer_id);
                  const name = customer ? (lang === "ar" ? customer.name_ar : customer.name_en) : b.customer_id;
                  return (
                    <TableRow key={b.customer_id} className="border-b border-border last:border-0">
                      <TableCell className="text-sm font-medium">{name}</TableCell>
                      <TableCell><AgingPill amount={b.current} tone="success" lang={lang} /></TableCell>
                      <TableCell><AgingPill amount={b.d1_30} tone="warning" lang={lang} /></TableCell>
                      <TableCell><AgingPill amount={b.d31_60} tone="warning" lang={lang} /></TableCell>
                      <TableCell><AgingPill amount={b.d60_plus} tone="danger" lang={lang} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </PageSection>
      )}

      {tab === "reservations" && (
        <PageSection padded={false}>
          {openReservationRows.length === 0 ? (
            <EmptyState icon={Lock} title={t("credit.no_reservations")} description="" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs">{t("credit.col_customer")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_order")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_amount")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_age")}</TableHead>
                  <TableHead className="text-xs">{t("credit.col_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openReservationRows.map(({ reservation, customer, order, ageDays }) => {
                  const name = customer ? (lang === "ar" ? customer.name_ar : customer.name_en) : reservation.customer_id;
                  const releasable = order?.status === "cancelled";
                  return (
                    <TableRow key={reservation.id} className="border-b border-border last:border-0">
                      <TableCell className="text-sm font-medium">{name}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground" dir="ltr">{order?.number ?? reservation.order_id}</TableCell>
                      <TableCell className="tabular-nums text-sm">{formatMoney(reservation.amount, lang)}</TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground">{ageDays}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!releasable}
                          title={releasable ? undefined : t("credit.release_disabled_hint")}
                          onClick={() => releaseReservation(reservation.id)}
                        >
                          {t("credit.action_release")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </PageSection>
      )}

      <ModalShell
        open={editLimitTarget !== null}
        onOpenChange={(o) => !o && setEditLimitTarget(null)}
        title={t("credit.edit_limit_dialog_title")}
        size="sm"
        footer={
          <Button onClick={saveEditLimit}>{t("credit.edit_limit_save")}</Button>
        }
      >
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">{t("credit.edit_limit_label")}</label>
          <Input
            type="number"
            min={0}
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            className="tabular-nums"
          />
        </div>
      </ModalShell>
    </div>
  );
}

function AgingPill({ amount, tone, lang }: { amount: number; tone: "success" | "warning" | "danger"; lang: "ar" | "en" }) {
  const TONE_CLASS: Record<string, string> = {
    success: "bg-success-tint text-success-text",
    warning: "bg-warning-tint text-warning-text",
    danger: "bg-danger-tint text-danger-text",
  };
  return (
    <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium tabular-nums", TONE_CLASS[tone])}>
      {formatMoney(amount, lang)}
    </span>
  );
}
