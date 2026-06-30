import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Pencil, GitBranch } from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { EmptyState }    from "@/components/patterns/EmptyState";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { ModalShell } from "@/components/patterns/ModalShell";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { useCan } from "@/lib/permissions";
import { useAdminData, type Branch } from "../data/useAdminData";

// ── Branch form dialog ────────────────────────────────────────────

function BranchDialog({
  initial, open, onClose, lang, t,
}: {
  initial: Branch | null;
  open:    boolean;
  onClose: () => void;
  lang:    "ar" | "en";
  t:       ReturnType<typeof useTranslation<"admin">>["t"];
}) {
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [code,   setCode]   = useState(initial?.code    ?? "");

  function handleSave() {
    onClose();
    toast.success(t("branches.saved_toast"));
  }

  const valid = nameAr.trim() && nameEn.trim() && code.trim();

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("branches.form_title")}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!valid} onClick={handleSave}>{lang === "ar" ? "حفظ" : "Save"}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("branches.form_name_ar")} *</Label>
          <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("branches.form_name_en")} *</Label>
          <Input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("branches.form_code")} *</Label>
          <Input value={code} onChange={e => setCode(e.target.value)} dir="ltr" className="font-mono" />
        </div>
      </div>
    </ModalShell>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function BranchesPage() {
  const { t, i18n } = useTranslation("admin");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";
  const can  = useCan();
  const { data, loading, error, isOffline, reload } = useAdminData();

  const [editing, setEditing] = useState<Branch | null>(null);
  const [newOpen, setNew]     = useState(false);

  const branches = data?.branches ?? [];

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("branches.title")} />
        <PageSection padded={false}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3.5 w-16 font-mono ms-auto" />
            </div>
          ))}
        </PageSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("branches.title")} />
        <PageSection><ErrorState description={t("errors.load")} onRetry={reload} /></PageSection>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader
          title={t("branches.title")}
          subtitle={t("branches.count", { n: branches.length })}
          actions={
            can("admin.branch.manage") ? (
              <Button size="sm" onClick={() => setNew(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("branches.new")}
              </Button>
            ) : undefined
          }
        />

        {isOffline && <OfflineBanner />}

        <PageSection padded={false}>
          {branches.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title={t("branches.no_branches")}
              description={t("branches.empty_sub")}
              action={can("admin.branch.manage")
                ? { label: t("branches.new"), onClick: () => setNew(true) }
                : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {(["col_name","col_code","col_actions"] as const).map(k => (
                      <TableHead key={k} className={[
                        "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                        "",
                      ].join(" ")}>
                        {t(`branches.${k}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map(b => (
                    <TableRow key={b.id} className="border-b border-border last:border-0">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded bg-muted flex items-center justify-center">
                            <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{lang === "ar" ? b.name_ar : b.name_en}</p>
                            <p className="text-xs text-muted-foreground">{lang === "ar" ? b.name_en : b.name_ar}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{b.code}</TableCell>
                      <TableCell>
                        {can("admin.branch.manage") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 text-muted-foreground"
                            onClick={() => setEditing(b)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t("branches.edit_btn")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PageSection>
      </div>

      <BranchDialog
        initial={null}
        open={newOpen}
        onClose={() => setNew(false)}
        lang={lang}
        t={t}
      />
      <BranchDialog
        initial={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        lang={lang}
        t={t}
      />
    </>
  );
}
