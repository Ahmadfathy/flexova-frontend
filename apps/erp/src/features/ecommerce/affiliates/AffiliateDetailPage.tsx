import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Copy, Check, MousePointerClick, ShoppingBag, Wallet, Users2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton } from "@/components/patterns/Skeletons";
import { StatusPill } from "@/components/patterns/StatusPill";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useEcommerceAffiliates } from "@/stores/ecommerceAffiliates";
import { useEcommerceOrders } from "@/stores/ecommerceOrders";
import {
  AFFILIATE_STATUS_PILL, PAYOUT_STATUS_PILL, ORDER_STATUS_PILL,
  affiliateOrders, isCommissionEligible, commissionEarned,
} from "../catalog";

const ArrowBack = ({ className }: { className?: string }) =>
  document.dir === "rtl" ? <ArrowRight className={className} /> : <ArrowLeft className={className} />;

function DetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

/** spec §6.2 — detail + payout. */
export function AffiliateDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const can = useCan();
  const navigate = useNavigate();

  const affiliate = useEcommerceAffiliates((s) => s.affiliates[id]);
  const payoutsMap = useEcommerceAffiliates((s) => s.payouts);
  const approvePayout = useEcommerceAffiliates((s) => s.approvePayout);
  const requestPayout = useEcommerceAffiliates((s) => s.requestPayout);
  const ordersMap = useEcommerceOrders((s) => s.orders);

  // Same detail-page five-states signal OrderDetailPage uses
  // (?mock=loading|error|offline — `empty` has no meaning for a single record).
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(false); setIsOffline(false);
      const { mockFetch } = await import("@/lib/mock/client");
      try {
        await mockFetch(async () => "ok" as const, "ok" as const);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof Error && e.message === "mock_offline") setIsOffline(true);
        else setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const [copied, setCopied] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [approveTarget, setApproveTarget] = useState<string | null>(null);

  const canManage = can("ecommerce.affiliates.manage");

  const orders = useMemo(() => Object.values(ordersMap), [ordersMap]);
  const log = useMemo(() => (affiliate ? affiliateOrders(affiliate.id, orders) : []), [affiliate, orders]);
  const earned = affiliate ? commissionEarned(affiliate.id, orders, affiliate.commission_pct) : 0;
  const payouts = useMemo(
    () => Object.values(payoutsMap).filter((p) => p.affiliate_id === id).sort((a, b) => b.requested_at.localeCompare(a.requested_at)),
    [payoutsMap, id]
  );
  const hasPendingPayout = payouts.some((p) => p.status === "pending_approval");

  if (loading) return <DetailSkeleton />;
  if (error) {
    return <div className="p-4"><ErrorState description={t("affiliates.error_body")} onRetry={() => window.location.reload()} /></div>;
  }

  if (!affiliate) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Users2}
          title={t("affiliates.not_found_title")}
          description={t("affiliates.not_found_body")}
          action={{ label: t("affiliates.back_to_list"), onClick: () => navigate("/ecommerce/affiliates") }}
        />
      </div>
    );
  }

  function copyLink() {
    navigator.clipboard?.writeText(affiliate!.link);
    setCopied(true);
    toast.success(t("affiliates.link_copied_toast"));
    setTimeout(() => setCopied(false), 1500);
  }

  function openRequestDialog() {
    setRequestAmount(String(affiliate!.balance_due));
    setRequestOpen(true);
  }

  function handleRequestPayout() {
    const amount = Number(requestAmount);
    if (!(amount > 0) || amount > affiliate!.balance_due) return;
    requestPayout(affiliate!.id, amount);
    toast.success(t("affiliates.payout_requested_toast"));
    setRequestOpen(false);
  }

  function handleApprovePayout() {
    if (!approveTarget) return;
    approvePayout(approveTarget);
    toast.success(t("affiliates.payout_approved_toast"));
    setApproveTarget(null);
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={affiliate.name_ar} crumbLabel={affiliate.name_ar} />

      {isOffline && <div className="px-4"><OfflineBanner message={t("affiliates.offline_note")} /></div>}

      <div className="px-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/ecommerce/affiliates")}>
          <ArrowBack className="h-4 w-4" /> {t("affiliates.back_to_list")}
        </Button>
        <StatusPill variant={AFFILIATE_STATUS_PILL[affiliate.status]} label={t(`affiliates.status_${affiliate.status}`)} />
      </div>

      <div className="px-4 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* START — link, stats, balance/payout */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 h-fit">
          <div>
            <p className="text-xs text-muted-foreground">{t("affiliates.unique_link")}</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs bg-muted rounded px-2 py-1 flex-1 truncate" dir="ltr">{affiliate.link}</code>
              <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={copyLink} aria-label={t("affiliates.copy_link")}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono" dir="ltr">{affiliate.code} · {affiliate.commission_pct}%</p>
          </div>

          <div className="pt-2 border-t border-border grid grid-cols-3 gap-2 text-center">
            <div>
              <MousePointerClick className="h-4 w-4 mx-auto text-muted-foreground" />
              <p className="text-sm font-semibold tabular-nums mt-1">{affiliate.clicks}</p>
              <p className="text-[10px] text-muted-foreground">{t("affiliates.stat_clicks")}</p>
            </div>
            <div>
              <ShoppingBag className="h-4 w-4 mx-auto text-muted-foreground" />
              <p className="text-sm font-semibold tabular-nums mt-1">{affiliate.attributed_orders}</p>
              <p className="text-[10px] text-muted-foreground">{t("affiliates.stat_orders")}</p>
            </div>
            <div>
              <Wallet className="h-4 w-4 mx-auto text-muted-foreground" />
              <p className="text-sm font-semibold tabular-nums mt-1">{formatMoney(earned, lang)}</p>
              <p className="text-[10px] text-muted-foreground">{t("affiliates.stat_earned")}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("affiliates.balance_due")}</span>
              <span className="text-sm font-semibold tabular-nums">{formatMoney(affiliate.balance_due, lang)}</span>
            </div>
            {canManage && (
              <Button
                size="sm" variant="outline" className="w-full mt-2"
                disabled={affiliate.balance_due <= 0 || hasPendingPayout}
                onClick={openRequestDialog}
              >
                {t("affiliates.request_payout")}
              </Button>
            )}
          </div>

          {payouts.length > 0 && (
            <div className="pt-2 border-t border-border space-y-1.5">
              <p className="text-xs text-muted-foreground">{t("affiliates.payouts_title")}</p>
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="tabular-nums">{formatMoney(p.amount, lang)}</span>
                    <StatusPill variant={PAYOUT_STATUS_PILL[p.status]} label={t(`affiliates.payout_status_${p.status}`)} />
                    {p.posted_voucher_id && (
                      <span className="font-mono text-[11px] text-muted-foreground" dir="ltr" title={t("affiliates.posted_voucher_label")}>
                        {p.posted_voucher_id}
                      </span>
                    )}
                  </div>
                  {canManage && p.status === "pending_approval" && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setApproveTarget(p.id)}>
                      {t("affiliates.approve_payout")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* END — attributed orders log */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">{t("affiliates.log_title")}</p>
          </div>
          {log.length === 0 ? (
            <EmptyState icon={ShoppingBag} title={t("affiliates.log_empty")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">{t("affiliates.col_order_code")}</TableHead>
                  <TableHead className="text-xs text-muted-foreground">{t("affiliates.col_order_status")}</TableHead>
                  <TableHead className="text-xs text-muted-foreground">{t("affiliates.col_order_total")}</TableHead>
                  <TableHead className="text-xs text-muted-foreground">{t("affiliates.col_commission")}</TableHead>
                  <TableHead className="text-xs text-muted-foreground">{t("affiliates.col_order_date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.map((o) => {
                  const eligible = isCommissionEligible(o.status);
                  return (
                    <TableRow key={o.id} className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/ecommerce/orders/${o.id}`)}>
                      <TableCell className="font-mono text-xs px-4 py-3" dir="ltr">{o.code}</TableCell>
                      <TableCell className="px-4 py-3"><StatusPill variant={ORDER_STATUS_PILL[o.status]} label={t(`orders.status_${o.status}`)} /></TableCell>
                      <TableCell className="tabular-nums text-sm px-4 py-3">{formatMoney(o.total, lang)}</TableCell>
                      <TableCell className="tabular-nums text-sm px-4 py-3">
                        {eligible ? formatMoney(Math.round((o.total * affiliate.commission_pct) / 100), lang) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums px-4 py-3">{formatDate(o.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title={t("affiliates.request_payout_title")}
        description={t("affiliates.request_payout_body")}
        confirmLabel={t("affiliates.request_payout")}
        onConfirm={handleRequestPayout}
        confirmDisabled={!(Number(requestAmount) > 0) || Number(requestAmount) > affiliate.balance_due}
      >
        <Input
          type="number" min={1} max={affiliate.balance_due} className="tabular-nums mt-2"
          value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(v) => !v && setApproveTarget(null)}
        title={t("affiliates.approve_payout_title")}
        description={t("affiliates.approve_payout_body")}
        confirmLabel={t("affiliates.approve_payout")}
        onConfirm={handleApprovePayout}
      />
    </div>
  );
}
