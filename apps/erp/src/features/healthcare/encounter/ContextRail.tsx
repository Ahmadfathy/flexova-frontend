import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { ownerName } from "@/lib/mock/healthcare";
import type { HcPatient, HcEncounter, HcOwner } from "@/features/healthcare/types";

const SPECIALTY_LABEL_AR: Record<string, string> = {
  species: "النوع",
  breed: "السلالة",
  weight_kg: "الوزن (كجم)",
};

interface ContextRailProps {
  patient: HcPatient;
  owner: HcOwner | undefined;
  lang: "ar" | "en";
  /** Prior encounters for this patient, most-recent first, current one excluded. */
  priorEncounters: HcEncounter[];
}

/** Fixed context rail (spec §4.2) — all PHI, hidden entirely without clinical.view. */
export function ContextRail({ patient, owner, lang, priorEncounters }: ContextRailProps) {
  const { t } = useTranslation("healthcare");
  const navigate = useNavigate();

  const hasAllergies = patient.allergies.length > 0;
  const hasChronic = patient.chronic.length > 0;
  const showWarningStrip = hasAllergies || hasChronic;

  const specialtyEntries = Object.entries(patient.specialty_ext ?? {});
  const showSpecialtyBlock = specialtyEntries.length > 0 || (owner && owner.relationship !== "self");

  return (
    <div className="space-y-4">
      {showWarningStrip && (
        <div className={`rounded-lg border p-3 space-y-1.5 ${hasAllergies ? "bg-danger-tint border-danger/20" : "bg-warning-tint border-warning/20"}`}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${hasAllergies ? "text-danger-text" : "text-warning-text"}`}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {t("encounter.rail_warning")}
          </div>
          {hasAllergies && (
            <p className="text-xs text-danger-text">{t("encounter.rail_allergies")}: {patient.allergies.join("، ")}</p>
          )}
          {hasChronic && (
            <p className="text-xs text-warning-text">{t("encounter.rail_chronic")}: {patient.chronic.join("، ")}</p>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <History className="h-3.5 w-3.5 shrink-0" />
            {t("encounter.rail_history")}
          </div>
          {priorEncounters.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("encounter.rail_history_empty")}</p>
          ) : (
            <ul className="space-y-1.5">
              {priorEncounters.slice(0, 3).map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/healthcare/encounter/${e.id}`)}
                    className="w-full text-start rounded px-2 py-1.5 -mx-2 hover:bg-muted transition-colors"
                  >
                    <span className="block text-xs font-medium text-foreground truncate">{e.diagnosis || e.complaint || t("encounter.rail_no_diagnosis")}</span>
                    <span className="block text-[11px] text-muted-foreground tabular-nums">{formatDate(e.date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {showSpecialtyBlock && (
        <Card>
          <CardContent className="p-4 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">{t("encounter.rail_specialty")}</p>
            {specialtyEntries.map(([key, value]) => (
              <p key={key} className="text-xs text-foreground flex justify-between gap-2">
                <span className="text-muted-foreground">{SPECIALTY_LABEL_AR[key] ?? key}</span>
                <span className="font-medium">{String(value)}</span>
              </p>
            ))}
            {owner && owner.relationship !== "self" && (
              <p className="text-xs text-foreground flex justify-between gap-2 pt-1 border-t border-border mt-1.5">
                <span className="text-muted-foreground">
                  {owner.relationship === "owner" ? t("encounter.rail_owner") : t("encounter.rail_guardian")}
                </span>
                <span className="font-medium">{ownerName(owner, lang)}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
