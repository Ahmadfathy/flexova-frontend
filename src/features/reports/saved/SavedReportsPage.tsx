import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Play, Trash2, Bookmark } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";

import { useReportsData } from "../data/useReportsData";

export function SavedReportsPage() {
  const { t, i18n } = useTranslation("reports");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const { data, loading, error, isOffline, reload } = useReportsData();

  const [deletedIds, setDeleted] = useState<Set<string>>(() => new Set());

  const library = data?.reportLibrary ?? [];
  const visible = (data?.savedReports ?? []).filter(s => !deletedIds.has(s.id));

  function baseName(id: string) {
    const r = library.find(l => l.id === id);
    return r ? (lang === "ar" ? r.name_ar : r.name_en) : id;
  }

  function handleDelete(id: string) {
    setDeleted(prev => new Set([...prev, id]));
    toast.success(t("saved.deleted_toast"));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("saved.title")} />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded border border-border p-5 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3.5 w-64" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("saved.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("saved.title")}
        count={t("saved.count", { n: visible.length })}
      />

      {isOffline && <OfflineBanner />}

      <PageSection padded={false}>
        {visible.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title={t("saved.no_saved")}
            description={t("saved.empty_sub")}
          />
        ) : (
          <div className="divide-y divide-border">
            {visible.map(sr => (
              <div key={sr.id} className="px-4 py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-sm truncate">{sr.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{baseName(sr.base)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                      <Play className="h-3 w-3" />
                      {t("saved.run_btn")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs text-danger hover:text-danger"
                      onClick={() => handleDelete(sr.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      {t("saved.delete_btn")}
                    </Button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {Object.entries(sr.filters).map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="text-xs font-normal gap-1">
                      <span className="text-muted-foreground">{k}:</span>
                      <span>{v}</span>
                    </Badge>
                  ))}
                  {sr.group_by && (
                    <Badge variant="outline" className="text-xs font-normal gap-1">
                      <span className="text-muted-foreground">{t("saved.group_by_label")}:</span>
                      <span>{sr.group_by}</span>
                    </Badge>
                  )}
                  {sr.sort && (
                    <Badge variant="outline" className="text-xs font-normal gap-1">
                      <span className="text-muted-foreground">{t("saved.sort_label")}:</span>
                      <span>{sr.sort}</span>
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}
