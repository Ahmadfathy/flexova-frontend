/**
 * /dev/eta-connector — ETA connector QA playground.
 * Directly drives the connector's zustand store (bypassing the mock service's
 * artificial network delay) so every status × environment × flag combination
 * can be inspected instantly, side-by-side, across all 4 real wired surfaces.
 * Not linked in the main nav; access directly via URL.
 */
import { useTranslation } from "react-i18next";

import { PageHeader }  from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { Alert }       from "@/components/ui/alert";
import { Badge }       from "@/components/ui/badge";
import { Button }      from "@/components/ui/button";
import { Switch }      from "@/components/ui/switch";
import { Label }       from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Link2 } from "lucide-react";

import { EtaBadge, ETA_CONN_STYLE } from "@/components/shell/EtaBadge";
import { EtaGateNotice } from "@/components/shell/EtaGateNotice";
import { EtaConnectBanner } from "@/features/sales/eta-hub/EtaConnectBanner";

import { useEtaConnection } from "@/hooks/useEtaConnection";
import { useEtaGate } from "@/hooks/useEtaGate";
import { useEtaConnectionStore } from "@/stores/etaConnection";
import { useCan } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type {
  EtaBlockPolicy, EtaConnectEntrypoint, EtaConnectionScope,
  EtaConnectionStatus, EtaEnvironment,
} from "@/lib/mock/eta";

const STATUSES: EtaConnectionStatus[] = ["disconnected", "connecting", "connected", "error"];
const ENVIRONMENTS: EtaEnvironment[] = ["sandbox", "production"];
const BLOCK_POLICIES: EtaBlockPolicy[] = ["draft_only", "full_block", "warn_only"];
const SCOPES: EtaConnectionScope[] = ["tenant", "branch"];
const ENTRYPOINTS: EtaConnectEntrypoint[] = ["settings", "banner", "hub"];

// Representative sample values per status — mirrors eta-connection.fixtures.json's
// mock_variants so the preview looks like a real connection, not a null stub.
const SAMPLE = {
  trn: "300123456700003",
  eSealRef: "eseal-usb-77213",
  lastTestedAt: "2026-07-01T09:12:00",
  errorAr: "تعذّر التحقق من شهادة الختم الإلكتروني — الرجاء إعادة تسجيل الدخول والمحاولة مرة أخرى.",
  errorEn: "E-seal certificate verification failed — please re-authenticate and try again.",
};

export function EtaConnectorPlayground() {
  const { t: tEta } = useTranslation("eta");
  const { t: tSales } = useTranslation("sales");
  const can = useCan();
  const canManageEta = can("eta.settings");

  const { connection, flags } = useEtaConnection();
  const etaGate = useEtaGate();
  const setConnection = useEtaConnectionStore((s) => s.setConnection);
  const setFlags = useEtaConnectionStore((s) => s.setFlags);

  const status = connection?.status ?? "disconnected";
  const environment = connection?.environment ?? "sandbox";
  const scope = flags?.connection_scope ?? "tenant";
  const blockPolicy = flags?.block_policy ?? "draft_only";
  const entrypoints = flags?.connect_entrypoints ?? [];

  function patchConnection(patch: Partial<NonNullable<typeof connection>>) {
    setConnection({
      id: connection?.id ?? "eta-conn-001",
      scope: connection?.scope ?? "tenant",
      scope_id: connection?.scope_id ?? "tenant-001",
      environment: connection?.environment ?? "sandbox",
      status: connection?.status ?? "disconnected",
      trn: connection?.trn ?? null,
      e_seal_ref: connection?.e_seal_ref ?? null,
      last_tested_at: connection?.last_tested_at ?? null,
      last_error_ar: connection?.last_error_ar ?? null,
      last_error_en: connection?.last_error_en ?? null,
      ...patch,
    });
  }

  function setStatus(next: EtaConnectionStatus) {
    if (next === "disconnected") {
      patchConnection({
        status: next, trn: null, e_seal_ref: null,
        last_tested_at: null, last_error_ar: null, last_error_en: null,
      });
    } else if (next === "connecting") {
      patchConnection({
        status: next, trn: SAMPLE.trn, e_seal_ref: null,
        last_tested_at: null, last_error_ar: null, last_error_en: null,
      });
    } else if (next === "connected") {
      patchConnection({
        status: next, trn: SAMPLE.trn, e_seal_ref: SAMPLE.eSealRef,
        last_tested_at: SAMPLE.lastTestedAt, last_error_ar: null, last_error_en: null,
      });
    } else {
      patchConnection({
        status: next, trn: SAMPLE.trn, e_seal_ref: SAMPLE.eSealRef,
        last_tested_at: SAMPLE.lastTestedAt, last_error_ar: SAMPLE.errorAr, last_error_en: SAMPLE.errorEn,
      });
    }
  }

  function setEnvironment(next: EtaEnvironment) {
    patchConnection({ environment: next });
  }

  function setScope(next: EtaConnectionScope) {
    patchConnection({ scope: next, scope_id: next === "tenant" ? "tenant-001" : "br_nasr" });
    setFlags({ block_policy: blockPolicy, connect_entrypoints: entrypoints, connection_scope: next });
  }

  function setBlockPolicy(next: EtaBlockPolicy) {
    setFlags({ block_policy: next, connect_entrypoints: entrypoints, connection_scope: scope });
  }

  function toggleEntrypoint(ep: EtaConnectEntrypoint) {
    const next = entrypoints.includes(ep) ? entrypoints.filter((x) => x !== ep) : [...entrypoints, ep];
    setFlags({ block_policy: blockPolicy, connect_entrypoints: next, connection_scope: scope });
  }

  function reset() {
    setConnection({
      id: "eta-conn-001", scope: "tenant", scope_id: "tenant-001",
      environment: "sandbox", status: "disconnected", trn: null, e_seal_ref: null,
      last_tested_at: null, last_error_ar: null, last_error_en: null,
    });
    setFlags({ block_policy: "draft_only", connect_entrypoints: [...ENTRYPOINTS], connection_scope: "tenant" });
  }

  const isSandbox = environment !== "production";
  const isConnNotReady = status === "disconnected" || status === "error";
  const hubEntrypointEnabled = entrypoints.includes("hub");

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="ETA Connector Playground"
        subtitle="Dev-only QA tool — drives the real connector store directly. Not linked in the main nav."
      />

      {/* ── Controls ─────────────────────────────────────────── */}
      <PageSection title="Controls" actions={<Button size="sm" variant="outline" onClick={reset}>Reset to defaults</Button>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as EtaConnectionStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{tEta(`connection.status_${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Environment</Label>
            <Select value={environment} onValueChange={(v) => setEnvironment(v as EtaEnvironment)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENVIRONMENTS.map((e) => <SelectItem key={e} value={e}>{tEta(`connection.environment_${e}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{tEta("flags.block_policy_label")}</Label>
            <Select value={blockPolicy} onValueChange={(v) => setBlockPolicy(v as EtaBlockPolicy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BLOCK_POLICIES.map((p) => <SelectItem key={p} value={p}>{tEta(`flags.block_policy_${p}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{tEta("flags.scope_label")}</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as EtaConnectionScope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPES.map((s) => <SelectItem key={s} value={s}>{tEta(`connection.scope_${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label>{tEta("flags.entrypoints_label")}</Label>
          <div className="flex flex-wrap gap-5">
            {ENTRYPOINTS.map((ep) => (
              <div key={ep} className="flex items-center gap-2">
                <Switch
                  checked={entrypoints.includes(ep)}
                  onCheckedChange={() => toggleEntrypoint(ep)}
                  aria-label={tEta(`entrypoints.${ep}`)}
                />
                <span className="text-sm">{tEta(`entrypoints.${ep}`)}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          connection_scope is stored on the flags but the mock connection is always tenant-wide
          (fixture has a single `eta_connection` record) — switching to "branch" here only changes
          the flag readout below, it does not resolve a per-branch connection yet.
        </p>
      </PageSection>

      {/* ── Resolved state readout ───────────────────────────── */}
      <PageSection title="Resolved state">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
          <div><p className="text-xs text-muted-foreground">status</p><p className="font-mono">{status}</p></div>
          <div><p className="text-xs text-muted-foreground">environment</p><p className="font-mono">{environment}</p></div>
          <div><p className="text-xs text-muted-foreground">scope / scope_id</p><p className="font-mono">{connection?.scope}/{connection?.scope_id}</p></div>
          <div><p className="text-xs text-muted-foreground">block_policy</p><p className="font-mono">{blockPolicy}</p></div>
          <div><p className="text-xs text-muted-foreground">canIssue</p><p className="font-mono">{String(etaGate.canIssue)}</p></div>
          <div><p className="text-xs text-muted-foreground">entrypoints</p><p className="font-mono">[{entrypoints.join(", ")}]</p></div>
        </div>
      </PageSection>

      {/* ── Live preview: topbar badge ───────────────────────── */}
      <PageSection title="Topbar badge (EtaBadge)">
        <div className="flex items-center gap-3 rounded border border-dashed border-border p-4">
          <EtaBadge />
          <span className="text-xs text-muted-foreground">
            clickable → /sales/settings/eta only when disconnected/error
          </span>
        </div>
      </PageSection>

      {/* ── Live preview: global banner ──────────────────────── */}
      <PageSection title={'Global banner (Invoice Editor / Invoices List) — gated by the "banner" entrypoint'}>
        <div className="rounded border border-dashed border-border p-4">
          <EtaConnectBanner />
          {!(isConnNotReady && entrypoints.includes("banner")) && (
            <p className="text-xs text-muted-foreground">
              (hidden — status is {status === "connected" || status === "connecting" ? "connected/connecting" : "disconnected/error"}
              {" "}and/or "banner" entrypoint is off)
            </p>
          )}
        </div>
      </PageSection>

      {/* ── Live preview: readiness panel notice ─────────────── */}
      <PageSection title="Invoice readiness-panel notice (useEtaGate + EtaGateNotice)">
        <div className="max-w-sm rounded border border-dashed border-border p-4 space-y-2">
          <EtaGateNotice
            gate={etaGate}
            onConnect={() => {}}
            connectLabel={tEta("connection.cta_connect")}
          />
          {!etaGate.etaNoticeText && (
            <p className="text-xs text-muted-foreground">
              (no notice — connected, or {"warn_only"} with no ETA-related issue)
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            etaHardBlocked={String(etaGate.etaHardBlocked)} · draftBlocked={String(etaGate.draftBlocked)}
          </p>
        </div>
      </PageSection>

      {/* ── Live preview: ETA Hub connection card + CTA ──────── */}
      <PageSection title={'ETA Hub — connection card + CTA (gated by the "hub" entrypoint + eta.settings permission)'}>
        <div className="rounded border border-dashed border-border p-4 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium",
                ETA_CONN_STYLE[status].badge,
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", ETA_CONN_STYLE[status].dot)} />
                {tEta(`connection.status_${status}`)}
              </span>
              <Badge variant="outline" className="text-xs">
                {tEta(`connection.environment_${environment}`)}
              </Badge>
            </div>
            {isConnNotReady && canManageEta && hubEntrypointEnabled && (
              <Button size="sm"><Link2 className="size-4 me-1.5" />{tEta(status === "error" ? "connection.cta_reconnect" : "connection.cta_connect")}</Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            CTA visible = isConnNotReady({String(isConnNotReady)}) && canManageEta({String(canManageEta)}) && hubEntrypointEnabled({String(hubEntrypointEnabled)})
          </p>
        </div>
      </PageSection>

      {/* ── Live preview: legacy sandbox/production business banner ── */}
      <PageSection title="Legacy sandbox/production banner (ETA Settings — driven by business settings, mirrored here via the environment control)">
        <div className="max-w-lg">
          {isSandbox
            ? <Alert variant="warning">{tSales("settings.env_sandbox_note")}</Alert>
            : <Alert variant="success">{tSales("settings.production_note")}</Alert>}
        </div>
      </PageSection>
    </div>
  );
}
