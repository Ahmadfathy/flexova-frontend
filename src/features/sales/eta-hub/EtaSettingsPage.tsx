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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  CheckCircle2, AlertTriangle, ShieldCheck, Lock,
  Building2, ArrowRight, Save,
} from "lucide-react";

import { useSalesData } from "@/features/sales/invoices/useSalesData";
import { useCan }       from "@/lib/permissions";
import { cn }           from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
export function EtaSettingsPage() {
  const { t, i18n } = useTranslation("sales");
  const lang = i18n.language as "ar" | "en";
  const nav  = useNavigate();
  const can  = useCan();

  const { data, loading, error, isOffline, reload } = useSalesData();

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
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );

  if (error) return <ErrorState description={error} onRetry={reload} />;

  const canEdit = can("eta.settings");
  if (!canEdit) return (
    <div className="space-y-6 p-6">
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
    <div className="space-y-6 p-6">
      {isOffline && <OfflineBanner />}

      {/* Sandbox warning strip */}
      {isSandbox && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <span>{t("settings.env_sandbox_note")}</span>
        </div>
      )}

      {/* Production confirmation strip */}
      {!isSandbox && (
        <div className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
          <span>{t("settings.production_note")}</span>
        </div>
      )}

      <PageHeader title={t("settings.title")} />

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
              "flex-1 rounded-lg border px-4 py-3 text-center text-sm font-medium transition-colors",
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
              "flex-1 rounded-lg border px-4 py-3 text-center text-sm font-medium transition-colors",
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
            "rounded-lg p-3",
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
                <TableHead className="text-end pe-4">{t("settings.numbering_next")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {numberingRows.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="ps-4 text-sm font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-sm" dir="ltr">{row.prefix}</TableCell>
                  <TableCell className="tabular-nums text-sm text-end pe-4" dir="ltr">
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
            <div className="rounded-lg border px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("settings.send_b2b")}
              </p>
              <p className="text-sm text-foreground">{t("settings.send_b2b_desc")}</p>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                {settings.send_behavior.b2b}
              </p>
            </div>
            <div className="rounded-lg border px-4 py-3 space-y-1">
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

      {/* ── Go Live AlertDialog ────────────────────────────────── */}
      <AlertDialog open={goLiveOpen} onOpenChange={setGoLiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.switch_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              {t("settings.switch_confirm_body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("settings.switch_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleGoLiveConfirm}
            >
              {t("settings.switch_confirm_action")}
              <ArrowRight className="size-3.5 ms-1" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
