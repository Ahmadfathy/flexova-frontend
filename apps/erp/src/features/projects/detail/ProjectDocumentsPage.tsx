import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FileText, Download } from "lucide-react";

import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ErrorState } from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { TableSkeleton } from "@/components/patterns/Skeletons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useProjectsStore, type DocumentFormInput } from "@/stores/projectsStore";
import { getProjectEmployee } from "@/lib/mock/projects";
import { useMockState } from "../useMockState";
import { DocumentUploadModal } from "./DocumentUploadModal";
import type { ProjectDocument } from "@/features/projects/types";

function DocumentRow({ doc, lang, milestoneName, t }: {
  doc: ProjectDocument;
  lang: "ar" | "en";
  milestoneName: string | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const uploader = getProjectEmployee(doc.uploaded_by);
  const uploaderName = uploader ? (lang === "ar" ? uploader.name_ar : uploader.name_en) : doc.uploaded_by;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-center h-9 w-9 rounded bg-muted text-muted-foreground shrink-0">
        <FileText className="h-4 w-4" />
      </div>

      <div className="min-w-[160px] flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{doc.name_ar}</p>
        {milestoneName && <p className="text-xs text-muted-foreground truncate">{milestoneName}</p>}
      </div>

      <Badge variant="outline" className="border-transparent bg-muted text-xs font-medium whitespace-nowrap">
        {doc.category_ar}
      </Badge>

      <span className="text-xs text-muted-foreground w-32 shrink-0 truncate">{uploaderName}</span>
      <span className="text-xs text-muted-foreground w-24 shrink-0">{formatDate(doc.date)}</span>

      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 ms-auto shrink-0"
        title={t("doc.download")}
        onClick={() => toast.info(t("doc.download_toast"))}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ProjectDocumentsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation("projects");
  const { lang } = useAppearance();
  const can = useCan();

  const allDocuments = useProjectsStore((s) => s.documents);
  const milestones = useProjectsStore((s) => s.milestones);
  const addDocument = useProjectsStore((s) => s.addDocument);
  const { loading, error, isOffline, forcedEmpty, reload } = useMockState();

  const canCreate = can("projects.document.create");

  const [uploadOpen, setUploadOpen] = useState(false);

  const documents = useMemo(
    () => (forcedEmpty ? [] : Object.values(allDocuments).filter((d) => d.project_id === id).sort((a, b) => b.date.localeCompare(a.date))),
    [allDocuments, id, forcedEmpty]
  );

  function handleSave(input: DocumentFormInput) {
    addDocument(id, input);
    toast.success(t("doc.upload_success"));
    setUploadOpen(false);
  }

  if (loading) {
    return <PageSection><TableSkeleton rows={3} cols={5} /></PageSection>;
  }
  if (error) {
    return <PageSection><ErrorState onRetry={reload} /></PageSection>;
  }

  return (
    <div className="space-y-4">
      {isOffline && <OfflineBanner message={t("list.offline_note")} />}

      <PageSection
        title={t("doc.title")}
        actions={canCreate && !isOffline ? (
          <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>{t("doc.upload")}</Button>
        ) : undefined}
        padded={false}
      >
        {documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("doc.empty_title")}
            description={t("doc.empty_body")}
            action={canCreate && !isOffline ? { label: t("doc.upload"), onClick: () => setUploadOpen(true) } : undefined}
          />
        ) : (
          documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              lang={lang}
              milestoneName={doc.milestone_id ? (lang === "ar" ? milestones[doc.milestone_id]?.name_ar : milestones[doc.milestone_id]?.name_en) ?? null : null}
              t={t}
            />
          ))
        )}
      </PageSection>

      <DocumentUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={id}
        onSave={handleSave}
      />
    </div>
  );
}
