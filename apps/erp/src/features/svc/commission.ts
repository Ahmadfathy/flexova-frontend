import type { SvcTicketLine, SvcTicketCommission } from "@/stores/svcTickets";
import { findProvider } from "./catalog";
import { lineNet, round2 } from "./ticketTotals";

/** Commission runs on collected — package-covered lines (no cash this settle) and lines without a provider contribute nothing. */
export function computeCommission(lines: SvcTicketLine[]): SvcTicketCommission[] {
  return lines
    .filter((l): l is SvcTicketLine & { provider_id: string } => l.type === "service" && !l.package_covered && !!l.provider_id)
    .map((l) => {
      const pct = findProvider(l.provider_id)?.commission_pct ?? 0;
      const base = lineNet(l);
      return { provider_id: l.provider_id, base, pct, amount: round2((base * pct) / 100), on: "collected" as const };
    });
}
