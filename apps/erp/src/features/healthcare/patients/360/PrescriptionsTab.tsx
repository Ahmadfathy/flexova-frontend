import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pill, Printer, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/EmptyState";
import { formatDate } from "@/lib/format";
import type { HcEncounter, HcOrder } from "@/features/healthcare/types";

interface PrescriptionsTabProps {
  encounters: HcEncounter[];
  ordersById: Record<string, HcOrder>;
}

/** Prescriptions tab (spec §6.2, PHI — reprint/WhatsApp). Grouped by visit, most recent first. */
export function PrescriptionsTab({ encounters, ordersById }: PrescriptionsTabProps) {
  const { t } = useTranslation("healthcare");

  // Derived from each order's own `encounter_id`, not the encounter's `orders[]`
  // list — see the note in `useHealthcareClinical`'s `ordersOf` helper.
  const allOrders = Object.values(ordersById);
  const groups = encounters
    .map((e) => ({ encounter: e, rx: allOrders.find((o) => o.encounter_id === e.id && o.type === "prescription") }))
    .filter((g): g is { encounter: HcEncounter; rx: HcOrder } => !!g.rx && (g.rx.items?.length ?? 0) > 0);

  if (groups.length === 0) {
    return <EmptyState icon={Pill} title={t("encounter.rx_empty")} />;
  }

  return (
    <div className="space-y-4">
      {groups.map(({ encounter, rx }) => (
        <div key={rx.id} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{formatDate(encounter.date)}</p>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 me-1.5" /> {t("encounter.rx_print")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toast.success(t("encounter.rx_whatsapp_sent"))}>
                <MessageCircle className="h-3.5 w-3.5 me-1.5" /> {t("encounter.rx_whatsapp")}
              </Button>
            </div>
          </div>
          <ul className="space-y-1">
            {rx.items!.map((item, i) => (
              <li key={i} className="text-sm text-foreground">
                <span className="font-medium">{item.drug}</span>
                <span className="text-muted-foreground"> — {item.dose} · {item.duration}{item.instructions ? ` · ${item.instructions}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
