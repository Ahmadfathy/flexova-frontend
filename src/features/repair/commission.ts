import {
  COMMISSION_RULES, findTechnician, type RprLaborLine, type RprCommission,
} from "./catalog";

/** Commission base = labor line price, per technician with a labor-basis commission rule.
 * Mirrors svc/commission.ts's local-compute workaround (no live HR engine exists to call). */
export function computeCommission(laborLines: RprLaborLine[]): RprCommission[] {
  return laborLines
    .filter((l) => !!l.technician_id)
    .map((l) => {
      const technician = findTechnician(l.technician_id);
      const rule = COMMISSION_RULES.find((r) => r.id === technician?.commission_rule_id && r.basis === "labor");
      const pct = rule?.value ?? 0;
      const amount = Math.round((l.price * pct) / 100 * 100) / 100;
      return { technician_id: l.technician_id, base: l.price, pct, amount, on: "collected" as const };
    });
}
