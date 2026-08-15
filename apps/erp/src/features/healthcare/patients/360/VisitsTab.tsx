import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarPlus } from "lucide-react";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EmptyState } from "@/components/patterns/EmptyState";
import { formatDate } from "@/lib/format";
import { getProvider, providerName } from "@/lib/mock/healthcare";
import type { HcEncounter } from "@/features/healthcare/types";

interface VisitsTabProps {
  encounters: HcEncounter[];
  lang: "ar" | "en";
  onStartVisit: () => void;
}

/** Visits tab (spec §6.2 timeline, PHI) — reads encounters, never recomputes. */
export function VisitsTab({ encounters, lang, onStartVisit }: VisitsTabProps) {
  const { t } = useTranslation("healthcare");
  const navigate = useNavigate();

  if (encounters.length === 0) {
    return (
      <EmptyState
        icon={CalendarPlus}
        title={t("patient360.visits_empty")}
        action={{ label: t("patient360.visits_empty_action"), onClick: onStartVisit }}
      />
    );
  }

  return (
    <ul className="space-y-2">
      {encounters.map((e) => {
        const provider = getProvider(e.provider_id);
        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => navigate(`/healthcare/encounter/${e.id}`)}
              className="w-full text-start rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{e.diagnosis || e.complaint || t("encounter.rail_no_diagnosis")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(e.date)} · {provider ? providerName(provider, lang) : e.provider_id}
                </p>
              </div>
              <StatusPill variant={e.status === "completed" ? "approved" : "in-progress"} label={t(`status.${e.status === "completed" ? "completed" : "in-visit"}`)} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
