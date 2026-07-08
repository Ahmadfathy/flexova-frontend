import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, PackageSearch, Repeat, LayoutDashboard, Search, Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Skeleton } from "@/components/patterns/Skeletons";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { formatMoney, formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useSvcPackages, type SvcPackage } from "@/stores/svcPackages";
import { useSvcSubscriptions } from "@/stores/svcSubscriptions";
import { useScopedCan } from "./permissions";
import { useSubscriptionsScreen } from "./useSubscriptionsScreen";
import { clientName, findClient, findService, serviceName } from "./catalog";
import { packageDisplayStatus, type PackageDisplayStatus } from "./subscriptionsLogic";
import { SubscriptionCard } from "./SubscriptionCard";
import { PackageSellDialog } from "./PackageSellDialog";
import { SubscriptionSellDialog } from "./SubscriptionSellDialog";

type TabKey = "packages" | "subscriptions" | "renewals";

const PACKAGE_STATUS_PILL: Record<PackageDisplayStatus, PillVariant> = {
  active: "approved",
  expired: "rejected",
  "used-up": "inactive",
};

function ScreenSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-3 p-4">
      <Skeleton className="h-9 w-56" />
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
    </div>
  );
}

export default function SubscriptionsPage() {
  const { t } = useTranslation("svc");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useScopedCan();

  const { loading, error, isOffline, reload } = useSubscriptionsScreen();

  const packages = useSvcPackages((s) => s.packages);
  const subscriptions = useSvcSubscriptions((s) => s.subscriptions);
  const suspend = useSvcSubscriptions((s) => s.suspend);
  const resume = useSvcSubscriptions((s) => s.resume);
  const cancel = useSvcSubscriptions((s) => s.cancel);
  const retry = useSvcSubscriptions((s) => s.retry);

  const [tab, setTab] = useState<TabKey>("packages");
  const [search, setSearch] = useState("");
  const [packageSellOpen, setPackageSellOpen] = useState(false);
  const [subscriptionSellOpen, setSubscriptionSellOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const forceRetryFail = useMemo(() => new URLSearchParams(window.location.search).get("mock") === "retry_fail", []);
  const forcedNoResults = useMemo(() => new URLSearchParams(window.location.search).get("mock") === "no_results", []);
  const canManage = can("svc.subscription.manage");

  function matchesSearch(clientId: string) {
    if (!search.trim()) return true;
    const client = findClient(clientId);
    if (!client) return false;
    const q = search.trim().toLowerCase();
    return client.name_ar.includes(search.trim()) || client.name_en.toLowerCase().includes(q);
  }

  const allPackages = Object.values(packages);
  const filteredPackages = forcedNoResults ? [] : allPackages.filter((p) => matchesSearch(p.client_id));

  const allSubscriptions = Object.values(subscriptions);
  const filteredSubscriptions = forcedNoResults ? [] : allSubscriptions.filter((s) => matchesSearch(s.client_id));

  const upcoming = allSubscriptions
    .filter((s) => s.status === "active")
    .sort((a, b) => a.renewal_date.localeCompare(b.renewal_date));
  const pastDue = allSubscriptions.filter((s) => s.status === "past_due");
  const suspendedList = allSubscriptions.filter((s) => s.status === "suspended");

  function handleSuspend(id: string) {
    suspend(id);
    toast.success(isOffline ? t("subscriptions.queued_toast") : t("subscriptions.suspended_toast"));
  }
  function handleResume(id: string) {
    resume(id);
    toast.success(isOffline ? t("subscriptions.queued_toast") : t("subscriptions.resumed_toast"));
  }
  function handleCancelConfirm() {
    if (!cancelTarget) return;
    cancel(cancelTarget);
    toast.success(isOffline ? t("subscriptions.queued_toast") : t("subscriptions.cancelled_toast"));
    setCancelTarget(null);
  }
  function handleRetry(id: string) {
    const result = retry(id, forceRetryFail);
    if (result === "success") toast.success(t("subscriptions.retry_success_toast"));
    else toast.error(t("subscriptions.retry_failed_toast"));
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4 pb-8">
        {isOffline && <OfflineBanner message={t("subscriptions.offline_note")} />}

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="icon" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/svc/calendar")} aria-label={t("ticket.back_to_calendar")}>
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Button>
          <h1 className="text-base font-semibold text-foreground">{t("subscriptions.title")}</h1>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="h-11 p-1 bg-muted gap-1">
            <TabsTrigger value="packages" className="h-9 px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <PackageSearch className="h-4 w-4" /> {t("subscriptions.tab_packages")}
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="h-9 px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Repeat className="h-4 w-4" /> {t("subscriptions.tab_subscriptions")}
            </TabsTrigger>
            <TabsTrigger value="renewals" className="h-9 px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <LayoutDashboard className="h-4 w-4" /> {t("subscriptions.tab_renewals")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <ScreenSkeleton />
        ) : error ? (
          <ErrorState title={t("subscriptions.error_title")} description={t("subscriptions.error_body")} onRetry={reload} />
        ) : (
          <>
            {tab !== "renewals" && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[10rem]">
                  <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("subscriptions.search_placeholder")} className="ps-9 h-11" />
                </div>
                {canManage ? (
                  <Button
                    variant="solid" tone="primary" className="h-11 shrink-0"
                    onClick={() => (tab === "packages" ? setPackageSellOpen(true) : setSubscriptionSellOpen(true))}
                  >
                    <Plus className="h-4 w-4 me-1.5" />
                    {tab === "packages" ? t("subscriptions.sell_package") : t("subscriptions.sell_subscription")}
                  </Button>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" /> {t("subscriptions.permission_required")}
                  </span>
                )}
              </div>
            )}

            {tab === "packages" && (
              filteredPackages.length === 0 ? (
                <EmptyState
                  icon={PackageSearch}
                  title={search ? t("subscriptions.no_results_title") : t("subscriptions.packages_empty_title")}
                  description={search ? t("subscriptions.no_results_body") : t("subscriptions.packages_empty_body")}
                  action={search ? { label: t("subscriptions.clear_search"), onClick: () => setSearch("") } : undefined}
                />
              ) : (
                <div className="space-y-2">
                  {filteredPackages.map((pkg) => <PackageRow key={pkg.id} pkg={pkg} lang={lang} t={t} />)}
                </div>
              )
            )}

            {tab === "subscriptions" && (
              filteredSubscriptions.length === 0 ? (
                <EmptyState
                  icon={Repeat}
                  title={search ? t("subscriptions.no_results_title") : t("subscriptions.subscriptions_empty_title")}
                  description={search ? t("subscriptions.no_results_body") : t("subscriptions.subscriptions_empty_body")}
                  action={search ? { label: t("subscriptions.clear_search"), onClick: () => setSearch("") } : undefined}
                />
              ) : (
                <div className="space-y-2">
                  {filteredSubscriptions.map((sub) => (
                    <SubscriptionCard
                      key={sub.id}
                      sub={sub}
                      lang={lang}
                      canManage={canManage}
                      onSuspend={handleSuspend}
                      onResume={handleResume}
                      onCancel={setCancelTarget}
                      onRetry={handleRetry}
                    />
                  ))}
                </div>
              )
            )}

            {tab === "renewals" && (
              <div className="space-y-5">
                <RenewalSection title={t("subscriptions.upcoming_title")} empty={t("subscriptions.upcoming_empty")}>
                  {upcoming.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{clientName(findClient(s.client_id), lang)}</p>
                        <p className="text-xs text-muted-foreground">{lang === "ar" ? s.plan_ar : s.plan_en}</p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-sm tabular-nums font-medium text-foreground">{formatDate(s.renewal_date)}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">{formatMoney(s.amount, lang)}</p>
                      </div>
                    </div>
                  ))}
                </RenewalSection>

                <RenewalSection title={t("subscriptions.past_due_title")} empty={t("subscriptions.past_due_empty")}>
                  {pastDue.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning-tint p-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{clientName(findClient(s.client_id), lang)}</p>
                        <p className="text-xs text-warning-text">
                          {t("subscriptions.since_label")} {formatDate(s.renewal_date)}
                          {s.next_retry && ` · ${t("subscriptions.next_retry_label")} ${formatDate(s.next_retry)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm tabular-nums font-medium text-foreground">{formatMoney(s.amount, lang)}</span>
                        {canManage && (
                          <Button variant="solid" tone="warning" size="sm" className="h-9" onClick={() => handleRetry(s.id)}>
                            {t("subscriptions.retry_action")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </RenewalSection>

                <RenewalSection title={t("subscriptions.suspended_title")} empty={t("subscriptions.suspended_empty")}>
                  {suspendedList.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger-tint p-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{clientName(findClient(s.client_id), lang)}</p>
                        <p className="text-xs text-danger-text">
                          {s.suspended_at && `${t("subscriptions.suspended_at_label")} ${formatDate(s.suspended_at)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm tabular-nums font-medium text-foreground">{formatMoney(s.amount, lang)}</span>
                        {canManage && (
                          <Button variant="solid" tone="success" size="sm" className="h-9" onClick={() => handleResume(s.id)}>
                            {t("subscriptions.reactivate_action")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </RenewalSection>
              </div>
            )}
          </>
        )}
      </div>

      <PackageSellDialog open={packageSellOpen} onOpenChange={setPackageSellOpen} lang={lang} />
      <SubscriptionSellDialog open={subscriptionSellOpen} onOpenChange={setSubscriptionSellOpen} lang={lang} />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title={t("subscriptions.cancel_title")}
        description={t("subscriptions.cancel_body")}
        confirmTone="danger"
        confirmLabel={t("subscriptions.cancel_action")}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}

function PackageRow({ pkg, lang, t }: { pkg: SvcPackage; lang: "ar" | "en"; t: (k: string, o?: Record<string, unknown>) => string }) {
  const status = packageDisplayStatus(pkg);
  const client = findClient(pkg.client_id);
  const service = findService(pkg.service_id);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{lang === "ar" ? pkg.name_ar : pkg.name_en}</p>
        <p className="text-xs text-muted-foreground truncate">{clientName(client, lang)} · {serviceName(service, lang)}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-end">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {t("subscriptions.remaining_sessions_count", { remaining: pkg.remaining, total: pkg.total_sessions })}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">{formatDate(pkg.valid_until)}</p>
        </div>
        <StatusPill variant={PACKAGE_STATUS_PILL[status]} label={t(`subscriptions.package_status.${status}`)} />
      </div>
    </div>
  );
}

function RenewalSection({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hasChildren ? <div className="space-y-2">{children}</div> : <p className="text-sm text-muted-foreground">{empty}</p>}
    </div>
  );
}
