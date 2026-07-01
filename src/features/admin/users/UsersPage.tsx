import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus, Shield, ShieldOff, ShieldCheck, KeyRound,
  UserCircle, GitBranch, Clock, Loader2,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill }    from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { ModalShell } from "@/components/patterns/ModalShell";

import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatDate } from "@/lib/format";
import { useCan }     from "@/lib/permissions";
import { useAdminData, type AdminUser } from "../data/useAdminData";

// ── Invite dialog ─────────────────────────────────────────────────

function InviteDialog({
  open, onClose, roles, branches, lang, t,
}: {
  open:     boolean;
  onClose:  () => void;
  roles:    { id: string; name_ar: string; name_en: string }[];
  branches: { id: string; name_ar: string; name_en: string }[];
  lang:     "ar" | "en";
  t:        ReturnType<typeof useTranslation<"admin">>["t"];
}) {
  const [name,   setName]   = useState("");
  const [login,  setLogin]  = useState("");
  const [role,   setRole]   = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    setName(""); setLogin(""); setRole("");
    toast.success(t("users.invited_toast"));
  }

  const valid = name.trim() && login.trim() && role;

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("users.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!valid || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {t("users.invite")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("users.form_name")} *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("users.form_login")} *</Label>
          <Input value={login} onChange={e => setLogin(e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("users.form_role")} *</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {roles.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {lang === "ar" ? r.name_ar : r.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("users.form_branch")}</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder={t("users.scope_all")} /></SelectTrigger>
            <SelectContent>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {lang === "ar" ? b.name_ar : b.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function UsersPage() {
  const { t, i18n } = useTranslation("admin");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const [searchParams] = useSearchParams();
  const { data, loading, error, isOffline, reload } = useAdminData();

  const [suspended, setSuspended] = useState<Set<string>>(() => new Set());
  const [activated, setActivated] = useState<Set<string>>(() => new Set());
  const [inviteOpen, setInvite]   = useState(searchParams.get("new") === "1");

  const users   = data?.users        ?? [];
  const roles   = data?.roleTemplates ?? [];
  const branches = data?.branches    ?? [];

  function isEffectivelySuspended(u: AdminUser) {
    if (suspended.has(u.id)) return true;
    if (activated.has(u.id)) return false;
    return u.status === "suspended";
  }

  function handleToggle(u: AdminUser) {
    if (u.is_last_admin) return;
    const isSuspended = isEffectivelySuspended(u);
    if (isSuspended) {
      setActivated(prev => new Set([...prev, u.id]));
      setSuspended(prev => { const n = new Set(prev); n.delete(u.id); return n; });
      toast.success(t("users.activated_toast"));
    } else {
      setSuspended(prev => new Set([...prev, u.id]));
      setActivated(prev => { const n = new Set(prev); n.delete(u.id); return n; });
      toast.success(t("users.suspended_toast"));
    }
  }

  function roleName(ids: string[]) {
    return ids.map(id => {
      const r = roles.find(rt => rt.id === id);
      return r ? (lang === "ar" ? r.name_ar : r.name_en) : id;
    }).join(", ");
  }

  function scopeLabel(u: AdminUser) {
    if (u.scope.branches === "all") return t("users.scope_all");
    if (Array.isArray(u.scope.branches) && u.scope.branches.length > 0) {
      const b = branches.find(br => br.id === u.scope.branches[0]);
      return b ? (lang === "ar" ? b.name_ar : b.name_en) : t("users.scope_branch");
    }
    return t("users.scope_branch");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("users.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full ms-auto" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("users.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("users.title")}
          count={t("users.count", { n: users.length })}
          actions={
            can("admin.user.manage") ? (
              <Button size="sm" onClick={() => setInvite(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("users.invite")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        <PageSection padded={false}>
          {users.length === 0 ? (
            <EmptyState
              icon={UserCircle}
              title={t("users.no_users")}
              description={t("users.empty_sub")}
              action={can("admin.user.manage")
                ? { label: t("users.invite"), onClick: () => setInvite(true) }
                : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {(["col_name","col_login","col_role","col_scope","col_twofa","col_last_login","col_status","col_actions"] as const).map(k => (
                      <TableHead key={k} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t(`users.${k}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => {
                    const susp = isEffectivelySuspended(u);
                    return (
                      <TableRow key={u.id} className="border-b border-border last:border-0">
                        {/* Name */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded bg-muted flex items-center justify-center text-xs font-semibold">
                              {u.name_ar.slice(0, 1)}
                            </div>
                            <span className="text-sm font-medium">{u.name_ar}</span>
                            {u.is_last_admin && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>{t("users.last_admin_tip")}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        {/* Login */}
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {u.login}
                        </TableCell>
                        {/* Role */}
                        <TableCell className="text-sm">{roleName(u.roles)}</TableCell>
                        {/* Scope */}
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <GitBranch className="h-3 w-3" />
                            {scopeLabel(u)}
                          </div>
                        </TableCell>
                        {/* 2FA */}
                        <TableCell>
                          {u.twofa
                            ? <span className="inline-flex items-center gap-1 text-xs text-success"><KeyRound className="h-3 w-3" />{t("users.twofa_on")}</span>
                            : <span className="text-xs text-muted-foreground">{t("users.twofa_off")}</span>
                          }
                        </TableCell>
                        {/* Last login */}
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(u.last_login)}
                          </div>
                        </TableCell>
                        {/* Status */}
                        <TableCell>
                          <StatusPill
                            variant={susp ? "cancelled" : "approved"}
                            label={t(susp ? "users.status_suspended" : "users.status_active")}
                          />
                        </TableCell>
                        {/* Actions */}
                        <TableCell className="text-start">
                          {can("admin.user.manage") && !u.is_last_admin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                              onClick={() => handleToggle(u)}
                            >
                              {susp
                                ? <><ShieldCheck className="h-3.5 w-3.5 text-success" />{t("users.activate_btn")}</>
                                : <><ShieldOff   className="h-3.5 w-3.5 text-danger"  />{t("users.suspend_btn")}</>
                              }
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </PageSection>
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInvite(false)}
        roles={roles}
        branches={branches}
        lang={lang}
        t={t}
      />
    </>
  );
}
