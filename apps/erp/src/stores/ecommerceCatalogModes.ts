import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getCatalogRules, getMirrorExceptionSeed, getBulkPublishCandidates, inventoryCategoryLabel } from "@/lib/mock/ecommerce";
import { useEcommerceProducts } from "@/stores/ecommerceProducts";
import type { EcCatalogRule, EcBulkCandidate, EcOnlineProduct } from "@/features/ecommerce/types";

/**
 * §3.7 catalog-mode local state: auto-publish rules (Mode 3) + mirror
 * hidden-exceptions (Mode 4). Bulk publish (Mode 2) has no state of its
 * own to keep here — it only ever calls `useEcommerceProducts`'
 * `createProduct` directly (see `bulkPublish` below), same store, same
 * `lastRevalidatedAt` stamp, no separate code path to keep "never
 * duplicates stock" true in two places.
 */

let ruleSeq = 2; // fixture's demo rule is rule_1

function seedRules(): Record<string, EcCatalogRule> {
  return Object.fromEntries(getCatalogRules().map((r) => [r.id, r]));
}

function seedMirrorHidden(): Record<string, boolean> {
  return Object.fromEntries(getMirrorExceptionSeed().map((e) => [e.inventory_item_id, e.hidden]));
}

/** Builds the display-shell `EcOnlineProduct` a bulk/auto-publish creates
 * — inventory defaults only (spec §3.7 "title = item name, price = ERP
 * price, no images/SEO initially — enrich later per item"). Never called
 * against an item that already has a product row (callers filter first),
 * so it can never clobber a curated display layer. */
function shellFromCandidate(candidate: EcBulkCandidate, storeCategory: string): Omit<EcOnlineProduct, "id"> {
  return {
    inventory_item_id: candidate.inventory_item_id,
    title_ar: candidate.name_ar,
    title_en: candidate.name_en,
    images: [],
    seo: {},
    store_category: storeCategory,
    online_price: null,
    erp_base_price: candidate.erp_price,
    erp_stock: candidate.erp_stock,
    erp_status: candidate.status,
    publish_status: "published",
  };
}

interface BulkPublishReport {
  publishedIds: string[];
  failed: { inventory_item_id: string; name_ar: string; reason: string }[];
}

interface SimulateArrivalResult {
  published: boolean;
  itemName: string;
}

interface EcommerceCatalogModesState {
  rules: Record<string, EcCatalogRule>;
  mirrorHidden: Record<string, boolean>;

  /** Governance-sensitive (`ecommerce.catalog.configure`) — CRUD on rules. */
  addRule: (input: Omit<EcCatalogRule, "id">) => string;
  updateRule: (id: string, patch: Partial<Omit<EcCatalogRule, "id">>) => void;
  toggleRuleAutoPublish: (id: string) => void;
  removeRule: (id: string) => void;

  /** Real computed count — how many *currently* unpublished candidates
   * sit in this rule's category (excludes suspended ones, same as a real
   * publish would). Spec §3.7 "dry-run preview ('سينشر X صنف')". */
  dryRunCount: (ruleId: string) => number;

  /** Demo-only stand-in for "a new inventory item arrives" (no such event
   * source exists in this mock) — creates one synthetic new item in the
   * rule's category and, if `auto_publish` is on, immediately auto-creates
   * its OnlineProduct shell so the "new qualifying items appear online
   * automatically" behavior is actually observable, not just described. */
  simulateNewArrival: (ruleId: string) => SimulateArrivalResult;

  /** `ecommerce.products.manage` — executes the bulk-import modal's
   * selection. Suspended candidates fail (golden rule: can't publish a
   * suspended ERP item), everything else gets a display shell. */
  bulkPublish: (candidates: EcBulkCandidate[], storeCategory: string) => BulkPublishReport;

  /** `ecommerce.products.manage` — mirror mode's per-item hide toggle. */
  toggleMirrorHidden: (inventoryItemId: string) => void;
  bulkHideMirror: (inventoryItemIds: string[]) => void;
}

export const useEcommerceCatalogModes = create<EcommerceCatalogModesState>()(
  persist(
    (set, get) => ({
      rules: seedRules(),
      mirrorHidden: seedMirrorHidden(),

      addRule: (input) => {
        const id = `rule_${ruleSeq++}`;
        set((s) => ({ rules: { ...s.rules, [id]: { ...input, id } } }));
        return id;
      },

      updateRule: (id, patch) =>
        set((s) => (s.rules[id] ? { rules: { ...s.rules, [id]: { ...s.rules[id], ...patch } } } : s)),

      toggleRuleAutoPublish: (id) =>
        set((s) => (s.rules[id] ? { rules: { ...s.rules, [id]: { ...s.rules[id], auto_publish: !s.rules[id].auto_publish } } } : s)),

      removeRule: (id) =>
        set((s) => {
          const next = { ...s.rules };
          delete next[id];
          return { rules: next };
        }),

      dryRunCount: (ruleId) => {
        const rule = get().rules[ruleId];
        if (!rule) return 0;
        const linkedIds = Object.values(useEcommerceProducts.getState().products).map((p) => p.inventory_item_id);
        const candidates = getBulkPublishCandidates(linkedIds);
        return candidates.filter((c) => c.inventory_category_id === rule.inventory_category_id && c.status === "active").length;
      },

      simulateNewArrival: (ruleId) => {
        const rule = get().rules[ruleId];
        const label = rule ? inventoryCategoryLabel(rule.inventory_category_id, "ar") : "";
        const itemName = `صنف تجريبي جديد (${label})`;
        if (!rule || !rule.auto_publish) return { published: false, itemName };

        const candidate: EcBulkCandidate = {
          inventory_item_id: `inv_auto_${Date.now()}`,
          name_ar: itemName,
          erp_price: 0,
          erp_stock: 20,
          status: "active",
          inventory_category_id: rule.inventory_category_id,
        };
        useEcommerceProducts.getState().createProduct(shellFromCandidate(candidate, rule.default_store_category));
        return { published: true, itemName };
      },

      bulkPublish: (candidates, storeCategory) => {
        const publishedIds: string[] = [];
        const failed: BulkPublishReport["failed"] = [];
        for (const c of candidates) {
          if (c.status === "suspended") {
            failed.push({ inventory_item_id: c.inventory_item_id, name_ar: c.name_ar, reason: "suspended" });
            continue;
          }
          const id = useEcommerceProducts.getState().createProduct(shellFromCandidate(c, storeCategory));
          publishedIds.push(id);
        }
        return { publishedIds, failed };
      },

      toggleMirrorHidden: (inventoryItemId) =>
        set((s) => ({ mirrorHidden: { ...s.mirrorHidden, [inventoryItemId]: !s.mirrorHidden[inventoryItemId] } })),

      bulkHideMirror: (inventoryItemIds) =>
        set((s) => {
          const next = { ...s.mirrorHidden };
          for (const id of inventoryItemIds) next[id] = true;
          return { mirrorHidden: next };
        }),
    }),
    { name: "flexova.ecommerce.catalogModes", partialize: (s) => ({ rules: s.rules, mirrorHidden: s.mirrorHidden }) }
  )
);
