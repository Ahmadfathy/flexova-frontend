import { z } from "zod";
import { fromBase, toBase } from "@/lib/wholesale/pricing";
import type { WholesaleCustomer, PriceListLine, WholesaleItem } from "@/types/wholesale";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface OrderLineDraftInput {
  _key: string;
  item_id: string;
  qty: number;
  uom_id: string;
}

export interface OrderDraftInput {
  customer_id: string;
  warehouse_id: string;
  date: string;
  delivery_date: string;
  lines: OrderLineDraftInput[];
}

/**
 * True when `qty` (in the line's selling unit) falls strictly between two
 * defined tiers for this item/price-list — i.e. it's covered by neither tier
 * but is inside the overall tiered range, so the fallback list price silently
 * applies (FE_13 §5 — "tier coverage... if the qty falls in a tier gap").
 * Qty below the first tier or an item with no tiers at all is NOT a gap —
 * that's just untiered/base pricing, which is valid.
 */
export function isTierGap(
  itemId: string,
  qty: number,
  uomId: string,
  priceListId: string | undefined,
  priceListLines: PriceListLine[],
): boolean {
  if (!priceListId || !(qty > 0)) return false;
  const line = priceListLines.find((l) => l.price_list_id === priceListId && l.item_id === itemId);
  if (!line || line.tiers.length === 0) return false;

  const qtyInTierUnit = fromBase(toBase(qty, uomId), line.tier_uom);
  const sorted = [...line.tiers].sort((a, b) => a.from_qty - b.from_qty);
  const matched = sorted.some((t) => t.from_qty <= qtyInTierUnit && (t.to_qty == null || qtyInTierUnit <= t.to_qty));
  if (matched) return false;

  const minFrom = sorted[0].from_qty;
  const maxTo = sorted[sorted.length - 1].to_qty ?? Infinity;
  return qtyInTierUnit >= minFrom && qtyInTierUnit <= maxTo;
}

export interface OrderSchemaContext {
  customer: WholesaleCustomer | undefined;
  priceListLines: PriceListLine[];
  items: WholesaleItem[];
  lang: "ar" | "en";
  t: Translate;
}

/**
 * FE_13 §5 validation: ≥1 line · qty>0 · delivery date ≥ order date · tier
 * coverage (gap → error naming the item). "Single warehouse per order" is
 * structurally guaranteed — the order model has exactly one `warehouse_id`
 * field, so there's nothing to violate.
 */
export function buildOrderSchema({ customer, priceListLines, items, lang, t }: OrderSchemaContext) {
  const lineSchema = z.object({
    _key: z.string(),
    item_id: z.string().min(1, t("order_editor.error_item_required")),
    qty: z.number().positive(t("order_editor.error_qty_positive")),
    uom_id: z.string().min(1),
  });

  return z
    .object({
      customer_id: z.string().min(1, t("order_editor.error_customer_required")),
      warehouse_id: z.string().min(1, t("order_editor.error_warehouse_required")),
      date: z.string().min(1, t("order_editor.error_date_required")),
      delivery_date: z.string().min(1, t("order_editor.error_delivery_date_required")),
      lines: z.array(lineSchema).min(1, t("order_editor.error_no_lines")),
    })
    .refine((d) => !d.date || !d.delivery_date || d.delivery_date >= d.date, {
      message: t("order_editor.error_delivery_before_order"),
      path: ["delivery_date"],
    })
    .superRefine((d, ctx) => {
      d.lines.forEach((line, idx) => {
        if (!line.item_id || !(line.qty > 0)) return;
        if (isTierGap(line.item_id, line.qty, line.uom_id, customer?.price_list_id, priceListLines)) {
          const item = items.find((i) => i.id === line.item_id);
          const name = item ? (lang === "ar" ? item.name_ar : item.name_en) : line.item_id;
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("order_editor.error_tier_gap", { item: name }),
            path: ["lines", idx, "item_id"],
          });
        }
      });
    });
}

export interface OrderBlocker {
  id: string;
  message: string;
  path: PropertyKey[];
}

/** Runs the schema and flattens zod issues into a display-ready blocker list. */
export function getOrderBlockers(
  draft: OrderDraftInput,
  schema: ReturnType<typeof buildOrderSchema>,
): OrderBlocker[] {
  const result = schema.safeParse(draft);
  if (result.success) return [];
  return result.error.issues.map((issue, i) => ({
    id: `${issue.path.join(".")}_${i}`,
    path: issue.path,
    message: issue.message,
  }));
}
