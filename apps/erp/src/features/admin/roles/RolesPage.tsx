import { useTranslation } from "react-i18next";
import { ShieldCheck, Users, GitBranch, AlertTriangle, Zap } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Badge } from "@/components/ui/badge";
import { cn }    from "@/lib/utils";
import { useAdminData, type RoleTemplate, type PermissionCatalog } from "../data/useAdminData";

// ── Module colour map ─────────────────────────────────────────────

const MODULE_COLOR: Record<string, string> = {
  inventory:  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  sales:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purchasing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  finance:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  crm:        "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  hr:         "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  reports:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  admin:      "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300",
  healthcare: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

// ── Permission pill ───────────────────────────────────────────────

function PermPill({ perm }: { perm: string }) {
  const isCritical  = perm.endsWith("!!");
  const isSensitive = perm.endsWith("!") && !isCritical;
  const name        = perm.replace(/!!?$/, "");
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono",
      isCritical  ? "bg-danger/10 text-danger border border-danger/20"   :
      isSensitive ? "bg-warning/10 text-warning border border-warning/20" :
                    "bg-muted text-muted-foreground",
    )}>
      {isCritical  && <Zap           className="h-2.5 w-2.5" />}
      {isSensitive && <AlertTriangle className="h-2.5 w-2.5" />}
      {name}
    </span>
  );
}

// ── Role card ─────────────────────────────────────────────────────

function RoleCard({
  role, catalog, lang, t,
}: {
  role:    RoleTemplate;
  catalog: PermissionCatalog;
  lang:    "ar" | "en";
  t:       ReturnType<typeof useTranslation<"admin">>["t"];
}) {
  const isAll      = role.permissions === "*";
  const permList   = isAll ? [] : (role.permissions as string[]);
  const excluded   = role.exclude ?? [];

  const scopeLabel = role.scope.branches === "all"
    ? t("roles.scope_all")
    : t("roles.scope_assigned");

  const rowLabel =
    role.scope.row_rule === "all"    ? t("roles.row_all")    :
    role.scope.row_rule === "branch" ? t("roles.row_branch") :
                                       t("roles.row_own");

  return (
    <div className="rounded-sm bg-card shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="font-semibold text-sm">
            {lang === "ar" ? role.name_ar : role.name_en}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            {t("roles.user_count", { n: role.user_count })}
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-normal shrink-0">
          {isAll
            ? t("roles.perm_all")
            : t("roles.perm_count", { n: permList.length })}
        </Badge>
      </div>

      {/* Scope row */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{scopeLabel}</span>
        <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{rowLabel}</span>
      </div>

      {/* Permissions by module */}
      {isAll ? (
        <p className="text-xs text-success font-medium">★ {t("roles.perm_all")}</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(catalog).map(([module, allPerms]) => {
            const granted = permList.filter(p =>
              allPerms.some(ap => ap === p || ap.startsWith(p.replace(/!!?$/, "")))
            );
            if (granted.length === 0) return null;
            const moduleKey = `roles.module_${module}` as Parameters<typeof t>[0];
            return (
              <div key={module}>
                <p className={cn(
                  "inline-block text-[10px] font-medium rounded-full px-2 py-0.5 mb-1",
                  MODULE_COLOR[module] ?? "bg-muted text-muted-foreground",
                )}>
                  {t(moduleKey)}
                </p>
                <div className="flex flex-wrap gap-1">
                  {granted.map(p => <PermPill key={p} perm={p} />)}
                </div>
              </div>
            );
          })}
          {excluded.length > 0 && (
            <div className="pt-1 border-t border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Excluded</p>
              <div className="flex flex-wrap gap-1">
                {excluded.map(p => (
                  <span key={p} className="inline-block rounded px-1.5 py-0.5 text-[10px] font-mono line-through text-muted-foreground bg-muted">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function RolesPage() {
  const { t, i18n } = useTranslation("admin");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useAdminData();

  const roles   = data?.roleTemplates     ?? [];
  const catalog = data?.permissionCatalog ?? {};

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("roles.title")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-sm bg-card shadow-sm p-5 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-20" />
              <div className="flex flex-wrap gap-1 pt-2">
                {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-5 w-14 rounded" />)}
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
        <PageHeader title={t("roles.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("roles.title")}
        count={t("roles.count", { n: roles.length })}
      />

      {isOffline && <OfflineBanner />}

      {roles.length === 0 ? (
        <PageSection>
          <EmptyState icon={ShieldCheck} title={t("roles.no_roles")} description={t("roles.empty_sub")} />
        </PageSection>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(r => (
            <RoleCard key={r.id} role={r} catalog={catalog} lang={lang} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
