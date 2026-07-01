import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Users, Loader2 } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { ModalShell } from "@/components/patterns/ModalShell";

import { cn } from "@/lib/utils";
import { useCan } from "@/lib/permissions";
import { useCrmData, type Segment } from "../data/useCrmData";

// ── Segment card ──────────────────────────────────────────────────

const CARD_ACCENTS = [
  "border-s-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  "border-s-purple-500 bg-purple-50/50 dark:bg-purple-950/20",
  "border-s-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
  "border-s-success bg-success/5",
  "border-s-danger bg-danger/5",
  "border-s-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20",
];

function SegmentCard({
  segment, index, lang, t,
}: {
  segment: Segment;
  index: number;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"crm">>["t"];
}) {
  const name   = lang === "ar" ? segment.name_ar : segment.name_en;
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

  return (
    <div className={cn(
      "rounded border border-border border-s-4 p-5 space-y-2",
      accent,
    )}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-base leading-tight">{name}</h3>
        <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      <p className="text-3xl font-bold tabular-nums">{segment.count}</p>
      <p className="text-xs text-muted-foreground">
        {t("segments.customers_count", { n: segment.count })}
      </p>
    </div>
  );
}

// ── Create dialog ─────────────────────────────────────────────────

function CreateDialog({
  open, onClose, lang, t,
}: {
  open: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"crm">>["t"];
}) {
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [saving, setSaving] = useState(false);

  const isValid = nameAr.trim() && nameEn.trim();

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("segments.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("segments.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!isValid || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("segments.form_name_ar")} *</Label>
          <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("segments.form_name_en")} *</Label>
          <Input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
        </div>
      </div>
    </ModalShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function SegmentsPage() {
  const { t, i18n } = useTranslation("crm");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const [searchParams] = useSearchParams();
  const { data, loading, error, isOffline, reload } = useCrmData();

  const [createOpen, setCreate] = useState(searchParams.get("new") === "1");

  const segments = data?.segments ?? [];

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("segments.title")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded border border-border p-5 space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("segments.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("segments.title")}
          count={t("segments.count", { n: segments.length })}
          actions={
            can("crm.segment.create") ? (
              <Button size="sm" onClick={() => setCreate(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("segments.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        {segments.length === 0 ? (
          <PageSection>
            <EmptyState
              icon={Users}
              title={t("segments.no_segments")}
              description={t("segments.empty_sub")}
              action={can("crm.segment.create")
                ? { label: t("segments.new"), onClick: () => setCreate(true) }
                : undefined}
            />
          </PageSection>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((seg, i) => (
              <SegmentCard key={seg.id} segment={seg} index={i} lang={lang} t={t} />
            ))}
          </div>
        )}
      </div>

      <CreateDialog open={createOpen} onClose={() => setCreate(false)} lang={lang} t={t} />
    </>
  );
}
