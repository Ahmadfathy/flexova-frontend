import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { DrawerShell } from "@/components/patterns/DrawerShell";
import { FormField, FormGrid } from "@/components/patterns/FormLayout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import {
  ArrowLeft, ArrowRight, Building2, CheckCircle2, Loader2,
} from "lucide-react";

import { useEtaConnection } from "@/hooks/useEtaConnection";
import { useEtaConnectionStore } from "@/stores/etaConnection";
import type { EtaEnvironment } from "@/lib/mock/eta";
import { cn } from "@/lib/utils";

const STEPS = ["business", "credentials", "environment", "test"] as const;
type Step = typeof STEPS[number];

interface EtaConnectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "reconnect" pre-fills known values and is offered from the error state. */
  mode?: "connect" | "reconnect";
}

export function EtaConnectWizard({ open, onOpenChange, mode = "connect" }: EtaConnectWizardProps) {
  const { t, i18n } = useTranslation("eta");
  const lang = i18n.language as "ar" | "en";
  const { status, connection, connect, reconnect } = useEtaConnection();

  const [step, setStep] = useState<Step>("business");
  const [attempted, setAttempted] = useState(false);

  const [trn, setTrn] = useState("");
  const [trnError, setTrnError] = useState("");
  const [activityAr, setActivityAr] = useState("");
  const [activityEn, setActivityEn] = useState("");
  const [esealType, setEsealType] = useState<"usb_token" | "hsm">("usb_token");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [environment, setEnvironment] = useState<EtaEnvironment>("sandbox");

  // Reset/prefill each time the wizard is (re)opened — read the store snapshot
  // imperatively so this doesn't re-run mid-wizard as the connection updates.
  useEffect(() => {
    if (!open) return;
    const current = useEtaConnectionStore.getState().connection;
    setStep("business");
    setAttempted(false);
    setTrn(mode === "reconnect" ? current?.trn ?? "" : "");
    setEnvironment(current?.environment ?? "sandbox");
    setActivityAr("");
    setActivityEn("");
    setEsealType("usb_token");
    setUsername("");
    setPassword("");
    setTrnError("");
  }, [open, mode]);

  const stepIdx = STEPS.indexOf(step);
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;
  const ForwardIcon = lang === "ar" ? ArrowLeft : ArrowRight;

  function handleClose() {
    onOpenChange(false);
  }

  function next() {
    if (step === "business") {
      if (!trn.trim()) { setTrnError(t("wizard.trn_required")); return; }
      setTrnError("");
    }
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1]);
  }

  function back() {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
    else handleClose();
  }

  async function handleTest() {
    setAttempted(true);
    const payload = {
      trn: trn.trim(),
      credentials: { type: esealType, username, password },
      environment,
    };
    if (mode === "reconnect") await reconnect(payload);
    else await connect(payload);
  }

  const isConnecting = attempted && status === "connecting";
  const isSuccess = attempted && status === "connected";
  const isError = attempted && status === "error";

  return (
    <DrawerShell
      open={open}
      onOpenChange={handleClose}
      title={mode === "reconnect" ? t("wizard.title_reconnect") : t("wizard.title")}
      description={t(`wizard.step_${step}_desc`)}
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={back}
            disabled={isConnecting}
          >
            {stepIdx === 0
              ? t("wizard.cancel")
              : (<><BackIcon className="h-4 w-4 me-1" />{t("wizard.back")}</>)}
          </Button>

          {step !== "test" && (
            <Button onClick={next}>
              {t("wizard.next")}
              <ForwardIcon className="h-4 w-4 ms-1" />
            </Button>
          )}

          {step === "test" && !attempted && (
            <Button onClick={handleTest}>{t("wizard.test_action")}</Button>
          )}

          {isConnecting && (
            <Button disabled>
              <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
              {t("connection.status_connecting")}
            </Button>
          )}

          {isSuccess && (
            <Button tone="success" onClick={handleClose}>{t("wizard.finish")}</Button>
          )}

          {isError && (
            <Button variant="outline" tone="danger" onClick={handleTest}>
              {t("wizard.retry")}
            </Button>
          )}
        </>
      }
    >
      {/* Step indicator */}
      <div className="shrink-0 -mx-6 -mt-4 px-6 pt-4 pb-3 border-b border-border bg-muted/20 mb-4">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 min-w-0">
              <div className={cn(
                "flex items-center justify-center rounded-full w-6 h-6 text-xs font-semibold shrink-0 transition-colors",
                i < stepIdx
                  ? "bg-primary text-primary-foreground"
                  : i === stepIdx
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground",
              )}>
                {i < stepIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn(
                "text-xs whitespace-nowrap hidden sm:block",
                i === stepIdx ? "text-foreground font-medium" : "text-muted-foreground",
              )}>
                {t(`wizard.step_${s}`)}
              </span>
              {i < STEPS.length - 1 && <div className="h-px w-4 bg-border shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* ── Step 1: Business details ── */}
        {step === "business" && (
          <div className="space-y-4">
            <FormField label={t("wizard.field_trn")} htmlFor="wizard-trn" required error={trnError}>
              <Input
                id="wizard-trn"
                value={trn}
                onChange={e => setTrn(e.target.value)}
                maxLength={14}
                inputMode="numeric"
                dir="ltr"
                className="font-mono tabular-nums"
                placeholder={t("wizard.field_trn_placeholder")}
              />
            </FormField>
            <FormGrid cols={2}>
              <FormField label={t("wizard.field_activity_ar")} htmlFor="wizard-activity-ar">
                <Input id="wizard-activity-ar" value={activityAr} onChange={e => setActivityAr(e.target.value)} dir="rtl" />
              </FormField>
              <FormField label={t("wizard.field_activity_en")} htmlFor="wizard-activity-en">
                <Input id="wizard-activity-en" value={activityEn} onChange={e => setActivityEn(e.target.value)} dir="ltr" />
              </FormField>
            </FormGrid>
          </div>
        )}

        {/* ── Step 2: Credentials ── */}
        {step === "credentials" && (
          <div className="space-y-4">
            <FormField label={t("wizard.field_eseal_type")} htmlFor="wizard-eseal-type">
              <Select value={esealType} onValueChange={v => setEsealType(v as "usb_token" | "hsm")}>
                <SelectTrigger id="wizard-eseal-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="usb_token">{t("wizard.field_eseal_usb")}</SelectItem>
                  <SelectItem value="hsm">{t("wizard.field_eseal_hsm")}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormGrid cols={2}>
              <FormField label={t("wizard.field_username")} htmlFor="wizard-username">
                <Input id="wizard-username" value={username} onChange={e => setUsername(e.target.value)} dir="ltr" autoComplete="off" />
              </FormField>
              <FormField label={t("wizard.field_password")} htmlFor="wizard-password">
                <Input id="wizard-password" type="password" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" autoComplete="new-password" />
              </FormField>
            </FormGrid>
            <p className="text-xs text-muted-foreground">{t("wizard.credentials_hint")}</p>
          </div>
        )}

        {/* ── Step 3: Environment ── */}
        {step === "environment" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEnvironment("sandbox")}
                className={cn(
                  "rounded border px-4 py-3 text-center text-sm font-medium transition-colors",
                  environment === "sandbox"
                    ? "border-warning/60 bg-warning/10 text-warning"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
                )}
              >
                <Building2 className="size-4 mx-auto mb-1" />
                {t("connection.environment_sandbox")}
              </button>
              <button
                type="button"
                onClick={() => setEnvironment("production")}
                className={cn(
                  "rounded border px-4 py-3 text-center text-sm font-medium transition-colors",
                  environment === "production"
                    ? "border-success/60 bg-success/10 text-success"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
                )}
              >
                <CheckCircle2 className="size-4 mx-auto mb-1" />
                {t("connection.environment_production")}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t("wizard.environment_hint")}</p>
          </div>
        )}

        {/* ── Step 4: Test connection ── */}
        {step === "test" && (
          <div className="space-y-4">
            <div className="rounded border border-border p-4 space-y-2 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("wizard.summary_title")}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("connection.trn_label")}</span>
                <span className="font-mono tabular-nums" dir="ltr">{trn || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("connection.eseal_label")}</span>
                <span>{esealType === "usb_token" ? t("wizard.field_eseal_usb") : t("wizard.field_eseal_hsm")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("wizard.field_environment")}</span>
                <span>
                  {environment === "sandbox" ? t("connection.environment_sandbox") : t("connection.environment_production")}
                </span>
              </div>
            </div>

            {isConnecting && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="size-4 animate-spin" />
                {t("connection.status_connecting")}
              </div>
            )}

            {isSuccess && (
              <Alert variant="success" title={t("wizard.test_success")}>
                {t("wizard.test_success_desc")}
              </Alert>
            )}

            {isError && (
              <Alert variant="danger" title={t("wizard.test_error_title")}>
                {(lang === "ar" ? connection?.last_error_ar : connection?.last_error_en) ?? t("errors.generic")}
              </Alert>
            )}
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
