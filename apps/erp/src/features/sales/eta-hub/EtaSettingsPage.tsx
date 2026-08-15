import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Switch }   from "@/components/ui/switch";
import { Alert }    from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { EtaConnectWizard } from "./EtaConnectWizard";

import {
  CheckCircle2, ShieldCheck, Lock,
  Building2, ArrowRight, Save, Link2, RefreshCw, Loader2,
} from "lucide-react";

import { useSalesData } from "@/features/sales/invoices/useSalesData";
import { useCan }       from "@/lib/permissions";
import { cn }           from "@/lib/utils";

import { useEtaConnection } from "@/hooks/useEtaConnection";
import type {
  EtaBlockPolicy, EtaConnectEntrypoint, EtaConnectionScope,
  EtaConnectionStatus, EtaEnvironment,
} from "@/lib/mock/eta";

// ── Connection status → badge classes (mirrors EtaBadge's palette) ──
const CONN_STYLE: Record<EtaConnectionStatus, { badge: string; dot: string }> = {
  disconnected: { badge: "bg-muted text-muted-foreground",        dot: "bg-muted-foreground" },
  connecting:   { badge: "bg-brand-tint text-brand-text",         dot: "bg-brand animate-pulse" },
  connected:    { badge: "bg-success-tint text-success-text",     dot: "bg-success" },
  error:        { badge: "bg-danger-tint text-danger-text",       dot: "bg-danger" },
};

// ═══════════════════════════════════════════════════════════════════
export function EtaSettingsPage() {
  const { t, i18n } = useTranslation("sales");
  const { t: tEta }  = useTranslation("eta");
  const lang = i18n.language as "ar" | "en";
  const nav  = useNavigate();
  const can  = useCan();

  const { data, loading, error, isOffline, reload } = useSalesData();

  // ── ETA connector (mock service + global store — see ETA-1) ───
  const {
    connection, flags, status: connStatus, environment: connEnvironment,
    test: testConnection, patchSettings,
  } = useEtaConnection();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<"connect" | "reconnect">("connect");
  const [retesting,  setRetesting]  = useState(false);
  const [switchEnvOpen, setSwitchEnvOpen] = useState(false);
  const [switching,     setSwitching]     = useState(false);
  const [savingFlags,   setSavingFlags]   = useState(false);

  function openConnectWizard()   { setWizardMode("connect");   setWizardOpen(true); }
  function openReconnectWizard() { setWizardMode("reconnect"); setWizardOpen(true); }

  async function handleRetest() {
    setRetesting(true);
    await testConnection();
    setRetesting(false);
  }

  async function handleSwitchEnvConfirm() {
    const nextEnv: EtaEnvironment = connEnvironment === "sandbox" ? "production" : "sandbox";
    setSwitching(true);
    await testConnection(nextEnv);
    setSwitching(false);
    setSwitchEnvOpen(false);
  }

  // `savingFlags` gates all three handlers below so overlapping clicks can't
  // race on a stale `flags` snapshot while a previous patch is in flight
  // (patchSettings replaces connect_entrypoints wholesale — see mock/eta.ts).
  async function handleBlockPolicyChange(value: string) {
    setSavingFlags(true);
    await patchSettings({ block_policy: value as EtaBlockPolicy });
    setSavingFlags(false);
    toast.success(tEta("flags.saved"));
  }

  async function handleScopeChange(value: string) {
    setSavingFlags(true);
    await patchSettings({ connection_scope: value as EtaConnectionScope });
    setSavingFlags(false);
    toast.success(tEta("flags.saved"));
  }

  async function handleToggleEntrypoint(ep: EtaConnectEntrypoint) {
    setSavingFlags(true);
    const current = flags?.connect_entrypoints ?? [];
    const next = current.includes(ep) ? current.filter(x => x !== ep) : [...current, ep];
    await patchSettings({ connect_entrypoints: next });
    setSavingFlags(false);
    toast.success(tEta("flags.saved"));
  }

  // ── Local env override (mock — production toggle is mock-persistent) ──
  const [localEnv,  setLocalEnv]  = useState<string | null>(null);
  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [saving,     setSaving]     = useState(false);

  // Business fields local state
  const [trn,        setTrn]        = useState<string | null>(null);
  const [activityAr, setActivityAr] = useState<string | null>(null);
  const [activityEn, setActivityEn] = useState<string | null>(null);

  // Enabled tax types local toggle state
  const [taxToggles, setTaxToggles] = useState<Record<string, boolean>>({});
  const [taxInit,    setTaxInit]     = useState(false);

  // ── Loading / error ───────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );

  if (error) return <ErrorState description={error} onRetry={reload} />;

  const canEdit = can("eta.settings");
  if (!canEdit) return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} />
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Lock className="size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground max-w-xs">
          {t("settings.permission_required")}
        </p>
        <Button variant="outline" size="sm" onClick={() => nav(-1)}>
          {lang === "ar" ? "رجوع" : "Go back"}
        </Button>
      </div>
    </div>
  );

  const settings  = data?.etaSettings;
  const taxTypes  = data?.taxTypes ?? [];
  const branches  = data?.branches ?? [];

  if (!settings) return null;

  // Resolved values (local override → fixture)
  const effectiveTrn        = trn        ?? settings.trn;
  const effectiveActivityAr = activityAr ?? settings.activity_ar ?? "";
  const effectiveActivityEn = activityEn ?? settings.activity_en ?? "";
  const effectiveEnv        = localEnv   ?? settings.environment;
  const isSandbox           = effectiveEnv !== "production";

  // Initialize tax toggles from fixture on first render
  if (!taxInit && taxTypes.length > 0) {
    const init: Record<string, boolean> = {};
    for (const tt of taxTypes) {
      init[tt.id] = (settings.enabled_tax_types ?? []).includes(tt.id);
    }
    setTaxToggles(init);
    setTaxInit(true);
  }

  // Branch numbering rows
  const numberingRows = Object.entries(settings.numbering?.branches ?? {}).map(
    ([branchId, info]) => {
      const branch = branches.find(b => b.id === branchId);
      return {
        id: branchId,
        name: branch ? (lang === "ar" ? branch.name_ar : branch.name_en) : branchId,
        prefix: info.prefix,
        next:   info.next,
      };
    },
  );

  async function handleSaveBusiness() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    toast.success(t("settings.saved"));
  }

  function handleGoLiveConfirm() {
    setLocalEnv("production");
    setGoLiveOpen(false);
    toast.success(t("settings.production_active"));
  }

  function toggleTax(id: string) {
    setTaxToggles(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings.title")}
        alert={
          <div className="space-y-2">
            {isOffline && <OfflineBanner />}
            {isSandbox
              ? <Alert variant="warning">{t("settings.env_sandbox_note")}</Alert>
              : <Alert variant="success">{t("settings.production_note")}</Alert>}
          </div>
        }
      />

      {/* ── ETA connector status ───────────────────────────────── */}
      <PageSection
        title={tEta("connection.section_title")}
        actions={connStatus === "connected" ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={retesting} onClick={handleRetest}>
              <RefreshCw className={cn("size-3.5 me-1", retesting && "animate-spin")} />
              {tEta("connection.cta_test")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSwitchEnvOpen(true)}>
              <ArrowRight className="size-3.5 me-1" />
              {tEta("connection.cta_switch_env")}
            </Button>
            <Button size="sm" variant="ghost" onClick={openReconnectWizard}>
              {tEta("connection.cta_reconnect")}
            </Button>
          </div>
        ) : undefined}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium", CONN_STYLE[connStatus].badge)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", CONN_STYLE[connStatus].dot)} />
              {tEta(`connection.status_${connStatus}`)}
            </span>
            <Badge variant="outline" className="text-xs">
              {connEnvironment === "sandbox" ? tEta("connection.environment_sandbox") : tEta("connection.environment_production")}
            </Badge>
          </div>

          {connStatus === "disconnected" && (
            <div className="flex flex-col items-start gap-3 rounded border border-dashed border-border p-4">
              <p className="text-sm text-muted-foreground">{tEta("connection.not_connected_yet")}</p>
              <Button onClick={openConnectWizard}>
                <Link2 className="size-4 me-1.5" />
                {tEta("connection.cta_connect")}
              </Button>
            </div>
          )}

          {connStatus === "error" && (
            <div className="space-y-3">
              <Alert variant="danger" title={tEta("connection.error_banner_title")}>
                {(lang === "ar" ? connection?.last_error_ar : connection?.last_error_en) ?? tEta("errors.generic")}
              </Alert>
              <Button onClick={openReconnectWizard}>
                <RefreshCw className="size-4 me-1.5" />
                {tEta("connection.cta_reconnect")}
              </Button>
            </div>
          )}

          {connStatus === "connecting" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {tEta("connection.status_connecting")}
            </div>
          )}

          {connStatus === "connected" && connection && (
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{tEta("connection.trn_label")}</p>
                <p className="font-mono tabular-nums" dir="ltr">{connection.trn ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{tEta("connection.eseal_label")}</p>
                <p>{connection.e_seal_ref ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{tEta("connection.last_tested")}</p>
                <p>
                  {connection.last_tested_at
                    ? new Date(connection.last_tested_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")
                    : tEta("connection.never_tested")}
                </p>
              </div>
            </div>
          )}
        </div>
      </PageSection>

      {/* ── ETA connector config flags ─────────────────────────── */}
      <PageSection title={tEta("flags.section_title")}>
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground -mt-1">{tEta("flags.section_subtitle")}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{tEta("flags.block_policy_label")}</Label>
              <Select value={flags?.block_policy ?? "draft_only"} onValueChange={handleBlockPolicyChange} disabled={savingFlags}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft_only">{tEta("flags.block_policy_draft_only")}</SelectItem>
                  <SelectItem value="full_block">{tEta("flags.block_policy_full_block")}</SelectItem>
                  <SelectItem value="warn_only">{tEta("flags.block_policy_warn_only")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {tEta(`flags.block_policy_${flags?.block_policy ?? "draft_only"}_desc`)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>{tEta("flags.scope_label")}</Label>
              <Select value={flags?.connection_scope ?? "tenant"} onValueChange={handleScopeChange} disabled={savingFlags}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">{tEta("connection.scope_tenant")}</SelectItem>
                  <SelectItem value="branch">{tEta("connection.scope_branch")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{tEta("flags.entrypoints_label")}</Label>
            <div className="flex flex-wrap gap-5">
              {(["settings", "banner", "hub"] as const).map(ep => (
                <div key={ep} className="flex items-center gap-2">
                  <Switch
                    checked={(flags?.connect_entrypoints ?? []).includes(ep)}
                    onCheckedChange={() => handleToggleEntrypoint(ep)}
                    disabled={savingFlags}
                    aria-label={tEta(`entrypoints.${ep}`)}
                  />
                  <span className="text-sm">{tEta(`entrypoints.${ep}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageSection>

      {/* ── Business details ───────────────────────────────────── */}
      <PageSection
        title={t("settings.section_business")}
        actions={
          <Button size="sm" disabled={saving} onClick={handleSaveBusiness}>
            {saving
              ? <><Save className="size-3.5 me-1 animate-pulse" />{t("settings.save")}</>
              : <><Save className="size-3.5 me-1" />{t("settings.save")}</>
            }
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trn-field">{t("settings.trn")}</Label>
            <Input
              id="trn-field"
              value={effectiveTrn}
              onChange={e => setTrn(e.target.value)}
              className="font-mono tabular-nums"
              dir="ltr"
              maxLength={9}
              placeholder="000000000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "ar" ? "النشاط" : "Activity"}</Label>
            <div className="flex gap-2">
              <Input
                value={effectiveActivityAr}
                onChange={e => setActivityAr(e.target.value)}
                placeholder={t("settings.activity_ar")}
                className="flex-1"
                dir="rtl"
              />
              <Input
                value={effectiveActivityEn}
                onChange={e => setActivityEn(e.target.value)}
                placeholder={t("settings.activity_en")}
                className="flex-1"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      </PageSection>

      {/* ── Environment ────────────────────────────────────────── */}
      <PageSection title={t("settings.section_env")}>
        <div className="space-y-4">
          {/* Toggle row */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex-1 rounded border px-4 py-3 text-center text-sm font-medium transition-colors",
              isSandbox
                ? "border-warning/60 bg-warning/10 text-warning"
                : "border-border bg-muted/30 text-muted-foreground",
            )}>
              <Building2 className="size-4 mx-auto mb-1" />
              {t("settings.env_sandbox")}
              {isSandbox && (
                <Badge variant="secondary" className="ms-2 text-xs">
                  {lang === "ar" ? "الحالي" : "current"}
                </Badge>
              )}
            </div>

            <ArrowRight className="size-4 text-muted-foreground shrink-0" />

            <div className={cn(
              "flex-1 rounded border px-4 py-3 text-center text-sm font-medium transition-colors",
              !isSandbox
                ? "border-success/60 bg-success/10 text-success"
                : "border-border bg-muted/30 text-muted-foreground",
            )}>
              <CheckCircle2 className="size-4 mx-auto mb-1" />
              {t("settings.env_production")}
              {!isSandbox && (
                <Badge variant="default" className="ms-2 text-xs">
                  {lang === "ar" ? "الحالي" : "current"}
                </Badge>
              )}
            </div>
          </div>

          {/* Environment current label */}
          <p className="text-xs text-muted-foreground">
            {t("settings.env_current")}:{" "}
            <span className={cn("font-medium", isSandbox ? "text-warning" : "text-success")}>
              {isSandbox ? t("settings.env_sandbox") : t("settings.env_production")}
            </span>
          </p>

          {/* Go live button — only visible in sandbox */}
          {isSandbox && (
            <Button
              variant="default"
              size="sm"
              className="gap-1"
              onClick={() => setGoLiveOpen(true)}
            >
              {t("settings.switch_to_prod")}
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </PageSection>

      {/* ── E-seal ─────────────────────────────────────────────── */}
      <PageSection
        title={t("settings.section_eseal")}
        actions={
          <Button size="sm" variant="outline" onClick={() => toast.info(t("settings.eseal_configure"))}>
            {settings.eseal.configured
              ? t("settings.eseal_reconfigure")
              : t("settings.eseal_configure")}
          </Button>
        }
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "rounded p-3",
            settings.eseal.configured
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive",
          )}>
            <ShieldCheck className="size-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {settings.eseal.configured
                ? t("settings.eseal_configured")
                : t("settings.eseal_not_configured")}
            </p>
            {settings.eseal.configured && (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("settings.eseal_type")}:{" "}
                  {settings.eseal.type === "usb_token"
                    ? t("settings.eseal_type_usb")
                    : t("settings.eseal_type_hsm")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.eseal_expires")}: {settings.eseal.expires}
                </p>
              </>
            )}
          </div>
        </div>
      </PageSection>

      {/* ── Numbering ──────────────────────────────────────────── */}
      {numberingRows.length > 0 && (
        <PageSection title={t("settings.section_numbering")} padded={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t("settings.numbering_branch")}</TableHead>
                <TableHead>{t("settings.numbering_prefix")}</TableHead>
                <TableHead className="pe-4">{t("settings.numbering_next")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {numberingRows.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="ps-4 text-sm font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-sm">{row.prefix}</TableCell>
                  <TableCell className="tabular-nums text-sm pe-4">
                    {row.next.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </PageSection>
      )}

      {/* ── Send behavior ──────────────────────────────────────── */}
      {settings.send_behavior && (
        <PageSection title={t("settings.section_send")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded border px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("settings.send_b2b")}
              </p>
              <p className="text-sm text-foreground">{t("settings.send_b2b_desc")}</p>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                {settings.send_behavior.b2b}
              </p>
            </div>
            <div className="rounded border px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("settings.send_b2c")}
              </p>
              <p className="text-sm text-foreground">{t("settings.send_b2c_desc")}</p>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                {settings.send_behavior.b2c}
              </p>
            </div>
          </div>
        </PageSection>
      )}

      {/* ── Enabled tax types ──────────────────────────────────── */}
      {taxTypes.length > 0 && (
        <PageSection title={t("settings.section_tax_types")}>
          <div className="space-y-3">
            {taxTypes.map(tt => (
              <div key={tt.id} className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {lang === "ar" ? tt.name_ar : tt.name_en}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums" dir="ltr">
                    {tt.code} · {tt.rate}%
                  </p>
                </div>
                <Switch
                  checked={taxToggles[tt.id] ?? false}
                  onCheckedChange={() => toggleTax(tt.id)}
                  aria-label={lang === "ar" ? tt.name_ar : tt.name_en}
                />
              </div>
            ))}
          </div>
        </PageSection>
      )}

      <ConfirmDialog
        open={goLiveOpen}
        onOpenChange={setGoLiveOpen}
        title={t("settings.switch_confirm_title")}
        description={t("settings.switch_confirm_body")}
        confirmTone="danger"
        confirmLabel={<>{t("settings.switch_confirm_action")}<ArrowRight className="size-3.5 ms-1" /></>}
        cancelLabel={t("settings.switch_cancel")}
        onConfirm={handleGoLiveConfirm}
      />

      {/* ── ETA connector: environment switch confirm ──────────── */}
      <ConfirmDialog
        open={switchEnvOpen}
        onOpenChange={setSwitchEnvOpen}
        title={tEta("connection.switch_env_confirm_title")}
        description={tEta("connection.switch_env_confirm_body")}
        confirmTone="warning"
        confirmLabel={connEnvironment === "sandbox" ? tEta("connection.switch_to_production") : tEta("connection.switch_to_sandbox")}
        loading={switching}
        onConfirm={handleSwitchEnvConfirm}
      />

      {/* ── ETA connector: connect / reconnect wizard ──────────── */}
      <EtaConnectWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        mode={wizardMode}
      />
    </div>
  );
}
