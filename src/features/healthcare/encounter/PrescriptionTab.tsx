import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Printer, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/patterns/EmptyState";
import type { HcOrder } from "@/features/healthcare/types";

interface PrescriptionTabProps {
  rxOrder: HcOrder | undefined;
  readOnly: boolean;
  onAdd: (item: { drug: string; dose: string; duration: string; instructions?: string }) => void;
  onRemove: (index: number) => void;
}

/**
 * Prescription tab (spec §4.3.2) — free-text items, independent of drug
 * inventory (dispensing is v2). "واتساب" simulates CRM's template send rather
 * than importing CommunicationCreateModal directly — that modal is bound to
 * CRM customers, not Healthcare patients, the same entity mismatch documented
 * for the Today Board's "＋ موعد" booking in Prompt 1.
 */
export function PrescriptionTab({ rxOrder, readOnly, onAdd, onRemove }: PrescriptionTabProps) {
  const { t } = useTranslation("healthcare");
  const items = rxOrder?.items ?? [];

  const [drug, setDrug] = useState("");
  const [dose, setDose] = useState("");
  const [duration, setDuration] = useState("");
  const [instructions, setInstructions] = useState("");

  function handleAdd() {
    if (!drug.trim() || !dose.trim() || !duration.trim()) {
      toast.error(t("encounter.rx_missing_fields"));
      return;
    }
    onAdd({ drug: drug.trim(), dose: dose.trim(), duration: duration.trim(), instructions: instructions.trim() || undefined });
    setDrug(""); setDose(""); setDuration(""); setInstructions("");
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState title={t("encounter.rx_empty")} />
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.drug}</p>
                <p className="text-xs text-muted-foreground">{item.dose} · {item.duration}{item.instructions ? ` · ${item.instructions}` : ""}</p>
              </div>
              {!readOnly && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onRemove(i)} aria-label={t("common:delete")}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input value={drug} onChange={(e) => setDrug(e.target.value)} placeholder={t("encounter.rx_drug")} />
            <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder={t("encounter.rx_dose")} />
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={t("encounter.rx_duration")} />
            <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={t("encounter.rx_instructions")} />
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5 me-1.5" /> {t("encounter.rx_add")}
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 me-1.5" /> {t("encounter.rx_print")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.success(t("encounter.rx_whatsapp_sent"))}>
            <MessageCircle className="h-3.5 w-3.5 me-1.5" /> {t("encounter.rx_whatsapp")}
          </Button>
        </div>
      )}
    </div>
  );
}
