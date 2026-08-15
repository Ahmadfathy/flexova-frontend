import { useTranslation } from "react-i18next";
import { FlaskConical } from "lucide-react";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EmptyState } from "@/components/patterns/EmptyState";
import { formatDate } from "@/lib/format";
import type { HcEncounter, HcOrder, HcResult } from "@/features/healthcare/types";

interface OrdersResultsTabProps {
  encounters: HcEncounter[];
  ordersById: Record<string, HcOrder>;
  resultsById: Record<string, HcResult>;
}

const STATUS_VARIANT = {
  pending: "pending", in_progress: "in-progress", ready: "approved", delivered: "approved", issued: "approved",
} as const;

/** Orders & Results tab (spec §6.2, PHI). Reads live off useHealthcareClinical —
 * a result entered on the Lab queue (Prompt 5) shows up here immediately. */
export function OrdersResultsTab({ encounters, ordersById, resultsById }: OrdersResultsTabProps) {
  const { t } = useTranslation("healthcare");

  // Derived from each order's own `encounter_id`, not the encounter's `orders[]`
  // list — see the note in `useHealthcareClinical`'s `ordersOf` helper.
  const allOrders = Object.values(ordersById);
  const rows = encounters
    .flatMap((e) => allOrders.filter((o) => o.encounter_id === e.id).map((order) => ({ encounter: e, order })))
    .filter((r) => r.order.type !== "prescription");

  if (rows.length === 0) {
    return <EmptyState icon={FlaskConical} title={t("patient360.orders_empty")} />;
  }

  return (
    <ul className="space-y-2">
      {rows.map(({ encounter, order }) => {
        const result = order.result_id ? resultsById[order.result_id] : undefined;
        return (
          <li key={order.id} className="rounded-lg border border-border p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{order.name_ar}</span>
              <StatusPill variant={STATUS_VARIANT[order.status] ?? "default"} label={t(`orderStatus.${order.status}`)} />
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(encounter.date)}</p>
            {result && (
              <p className="text-sm text-foreground bg-muted/40 rounded px-2 py-1.5">{result.value}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
