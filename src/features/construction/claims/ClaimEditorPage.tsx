import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";

import { useConstructionStore } from "@/stores/constructionStore";

/**
 * `/projects/:id/claims/new` is a resolver, not a form — the claim table needs its `prev_qty`
 * baseline and auto claim_no reserved up front (spec §6.2/6.3), so the draft is created
 * immediately on mount and the user is redirected to `/claims/:id`, which owns the real form.
 * Splitting the route this way also gives §6.7's "one open draft per project" a single place
 * to resolve: visiting `/new` while a draft/submitted claim already exists just resumes it.
 */
export function ClaimEditorPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("construction");
  const createProgressClaim = useConstructionStore((s) => s.createProgressClaim);
  const progressClaims = useConstructionStore((s) => s.progress_claims);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const result = createProgressClaim(id);
    if (result.ok) {
      navigate(`/projects/${id}/claims/${result.id}`, { replace: true });
      return;
    }
    if (result.reason === "open_claim_exists") {
      const open = Object.values(progressClaims).find((c) => c.status === "draft" || c.status === "submitted");
      if (open) navigate(`/projects/${id}/claims/${open.id}`, { replace: true });
      return;
    }
    setBlocked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!blocked) return null;

  return (
    <div className="space-y-4">
      <PageHeader title={t("claim.new_claim")} />
      <PageSection>
        <EmptyState
          icon={Receipt}
          title={t("claim.no_boq_blocked")}
          action={{ label: t("claim.no_boq_cta"), onClick: () => navigate(`/projects/${id}/boq`) }}
        />
      </PageSection>
    </div>
  );
}
