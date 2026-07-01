import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ShieldCheck, KeyRound, Clock, MonitorSmartphone, Loader2 } from "lucide-react";

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
import { Separator }from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatDate } from "@/lib/format";
import { useCan }     from "@/lib/permissions";
import { useAdminData, type SecurityPolicy } from "../data/useAdminData";

// ── Main page ─────────────────────────────────────────────────────

export function SecurityPage() {
  const { t, i18n } = useTranslation("admin");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useAdminData();

  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [revokedIds, setRevoked] = useState<Set<string>>(() => new Set());

  const effectivePolicy: SecurityPolicy | null = policy ?? data?.securityPolicy ?? null;

  function updatePolicy(patch: Partial<SecurityPolicy>) {
    setPolicy(prev => {
      const base = prev ?? data?.securityPolicy ?? {} as SecurityPolicy;
      return { ...base, ...patch };
    });
  }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    toast.success(t("security.saved_toast"));
  }

  function handleRevoke(id: string) {
    setRevoked(prev => new Set([...prev, id]));
    toast.success(t("security.revoked_toast"));
  }

  const sessions = (data?.sessions ?? []).filter(s => !revokedIds.has(s.id));

  function userName(userId: string) {
    const u = (data?.users ?? []).find(u => u.id === userId);
    return u?.name_ar ?? userId;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("security.title")} />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded border border-border p-5 space-y-3">
              <Skeleton className="h-4 w-36" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("security.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  const pw   = effectivePolicy?.password;
  const twofa = effectivePolicy?.twofa;
  const canEdit = can("admin.security.config");

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title={t("security.title")}
        actions={
          canEdit ? (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              {lang === "ar" ? "حفظ التغييرات" : "Save changes"}
            </Button>
          ) : undefined
        }
      />

      {isOffline && <OfflineBanner />}

      {/* Password policy */}
      <PageSection title={t("security.password_title")} padded>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">{t("security.min_length")}</Label>
            <Input
              type="number"
              dir="ltr"
              className="w-24 text-center"
              value={pw?.min_length ?? 8}
              onChange={e => updatePolicy({ password: { ...(pw ?? { require_number: true, require_symbol: false }), min_length: Number(e.target.value) } })}
              disabled={!canEdit}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("security.require_number")}</Label>
            <Switch
              checked={pw?.require_number ?? false}
              onCheckedChange={v => updatePolicy({ password: { ...(pw ?? { min_length: 8, require_symbol: false }), require_number: v } })}
              disabled={!canEdit}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("security.require_symbol")}</Label>
            <Switch
              checked={pw?.require_symbol ?? false}
              onCheckedChange={v => updatePolicy({ password: { ...(pw ?? { min_length: 8, require_number: true }), require_symbol: v } })}
              disabled={!canEdit}
            />
          </div>
        </div>
      </PageSection>

      {/* 2FA */}
      <PageSection title={t("security.twofa_title")} padded>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("security.twofa_available")}</Label>
            </div>
            <Switch
              checked={twofa?.available ?? false}
              onCheckedChange={v => updatePolicy({ twofa: { ...(twofa ?? { enforced: false }), available: v } })}
              disabled={!canEdit}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("security.twofa_enforced")}</Label>
              <p className="text-xs text-muted-foreground">
                {twofa?.enforced ? t("security.twofa_enforced_on") : t("security.twofa_enforced_off")}
              </p>
            </div>
            <Switch
              checked={twofa?.enforced ?? false}
              onCheckedChange={v => updatePolicy({ twofa: { ...(twofa ?? { available: true }), enforced: v } })}
              disabled={!canEdit || !twofa?.available}
            />
          </div>
        </div>
      </PageSection>

      {/* Session settings */}
      <PageSection title={t("security.session_title")} padded>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">{t("security.session_timeout")}</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                dir="ltr"
                className="w-24 text-center"
                value={effectivePolicy?.session_timeout_minutes ?? 120}
                onChange={e => updatePolicy({ session_timeout_minutes: Number(e.target.value) })}
                disabled={!canEdit}
              />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("security.trusted_devices")}</Label>
            <Switch
              checked={effectivePolicy?.trusted_devices ?? false}
              onCheckedChange={v => updatePolicy({ trusted_devices: v })}
              disabled={!canEdit}
            />
          </div>
        </div>
      </PageSection>

      {/* Active sessions */}
      <PageSection title={t("security.session_title")} padded={false}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {(["col_device","col_ip","col_started","col_current","col_actions"] as const).map(k => (
                  <TableHead key={k} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(`security.${k}` as Parameters<typeof t>[0])}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map(s => (
                <TableRow key={s.id} className="border-b border-border last:border-0">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">{s.device}</p>
                        <p className="text-xs text-muted-foreground">{userName(s.user_id)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.ip}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(s.started)}</TableCell>
                  <TableCell>
                    {s.current && (
                      <Badge variant="default" className="text-xs">
                        {t("security.current_badge")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!s.current && can("admin.security.config") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-danger hover:text-danger"
                        onClick={() => handleRevoke(s.id)}
                      >
                        {t("security.revoke_btn")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageSection>
    </div>
  );
}
