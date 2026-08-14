import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getEncounters, getOrders, getInvoices, getResults, getPlan, getPatient, getCatalog } from "@/lib/mock/healthcare";
import { computeInsuranceSplit, round2 } from "@/features/healthcare/calc";
import type { HcEncounter, HcOrder, HcInvoice, HcResult, SyncStatus } from "@/features/healthcare/types";

/**
 * Live clinical working set (spec §4 — Encounter is the module heart).
 * Single source of truth for encounters/orders/invoices from here on: seeded
 * once from the fixture (so completed historical visits still read correctly),
 * then every new visit created through the Encounter screen writes here too —
 * Today Board's collect flow and Patient 360 (Prompt 4) read through this
 * store rather than the static fixture accessors once a visit has happened.
 */

function isOfflineMock(): boolean {
  return new URLSearchParams(window.location.search).get("mock") === "offline";
}

function seedEncounters(): Record<string, HcEncounter> {
  return Object.fromEntries(getEncounters().map((e) => [e.id, e]));
}
function seedOrders(): Record<string, HcOrder> {
  return Object.fromEntries(getOrders().map((o) => [o.id, o]));
}
function seedInvoices(): Record<string, HcInvoice> {
  return Object.fromEntries(getInvoices().map((i) => [i.id, i]));
}
function seedResults(): Record<string, HcResult> {
  return Object.fromEntries(getResults().map((r) => [r.id, r]));
}

let localSeq = 9000;
function nextLocalId(prefix: string): string {
  localSeq += 1;
  return `${prefix}_local_${localSeq}`;
}

export interface InvoiceLine {
  key: string;
  label_ar: string;
  amount: number;
}

/** Derived from each order's own `encounter_id`, not the encounter's `orders[]`
 * list — the fixture has at least one order (ord_7003) that list never picked
 * up, so trusting the array silently drops real orders. */
function ordersOf(allOrders: Record<string, HcOrder>, encounterId: string): HcOrder[] {
  return Object.values(allOrders).filter((o) => o.encounter_id === encounterId);
}

interface ClinicalState {
  encounters: Record<string, HcEncounter>;
  orders: Record<string, HcOrder>;
  invoices: Record<string, HcInvoice>;
  results: Record<string, HcResult>;
  /** Per-encounter offline indicator (spec §4.5 — "encounter-level local/syncing/synced"). */
  sync: Record<string, SyncStatus>;
  /** Per-order offline indicator (spec §7.5 — "offline: result entry local + sync"). */
  resultSync: Record<string, SyncStatus>;

  ensureEncounter: (id: string, seed: { patient_id: string; provider_id: string; appointment_id: string }) => void;
  updateDiagnosis: (id: string, patch: Partial<Pick<HcEncounter, "complaint" | "diagnosis" | "clinical_note">>) => void;
  addPrescriptionItem: (encounterId: string, item: { drug: string; dose: string; duration: string; instructions?: string }) => void;
  removePrescriptionItem: (encounterId: string, index: number) => void;
  addCatalogOrder: (encounterId: string, catalogId: string) => void;
  addManualOrder: (encounterId: string, input: { name_ar: string; price: number; type: "lab" | "radiology" | "procedure" }) => void;
  removeOrder: (encounterId: string, orderId: string) => void;
  invoiceLines: (encounterId: string) => InvoiceLine[];
  canFinish: (encounterId: string) => boolean;
  finishVisit: (encounterId: string) => { ok: true; invoice: HcInvoice } | { ok: false };
  /** Lab queue (spec §7.3) — pending/in_progress → ready; writes the Result and
   * links it back onto the order (`result_id`). */
  enterResult: (orderId: string, input: { value: string; attachment?: string; note?: string }) => void;
  deliverResult: (orderId: string) => void;
}

export const useHealthcareClinical = create<ClinicalState>()(
  persist(
    (set, get) => ({
      encounters: seedEncounters(),
      orders: seedOrders(),
      invoices: seedInvoices(),
      results: seedResults(),
      sync: {},
      resultSync: {},

      ensureEncounter: (id, seed) => {
        if (get().encounters[id]) return;
        const fresh: HcEncounter = {
          id,
          patient_id: seed.patient_id,
          provider_id: seed.provider_id,
          appointment_id: seed.appointment_id,
          date: new Date().toISOString().slice(0, 10),
          type: "consult",
          complaint: "",
          diagnosis: null,
          clinical_note: null,
          status: "open",
          orders: [],
          invoice_id: null,
        };
        set((s) => ({ encounters: { ...s.encounters, [id]: fresh } }));
      },

      updateDiagnosis: (id, patch) => {
        set((s) => {
          const e = s.encounters[id];
          if (!e) return s;
          return { encounters: { ...s.encounters, [id]: { ...e, ...patch } } };
        });
      },

      addPrescriptionItem: (encounterId, item) => {
        set((s) => {
          const e = s.encounters[encounterId];
          if (!e) return s;
          const rxId = e.orders.find((oid) => s.orders[oid]?.type === "prescription");
          const orders = { ...s.orders };
          let orderIds = e.orders;
          if (rxId && orders[rxId]) {
            orders[rxId] = { ...orders[rxId], items: [...(orders[rxId].items ?? []), item] };
          } else {
            const newId = nextLocalId("ord");
            orders[newId] = { id: newId, encounter_id: encounterId, type: "prescription", name_ar: "روشتة", status: "issued", items: [item] };
            orderIds = [...e.orders, newId];
          }
          return { orders, encounters: { ...s.encounters, [encounterId]: { ...e, orders: orderIds } } };
        });
      },

      removePrescriptionItem: (encounterId, index) => {
        set((s) => {
          const e = s.encounters[encounterId];
          if (!e) return s;
          const rxId = e.orders.find((oid) => s.orders[oid]?.type === "prescription");
          if (!rxId || !s.orders[rxId]) return s;
          const items = (s.orders[rxId].items ?? []).filter((_, i) => i !== index);
          return { orders: { ...s.orders, [rxId]: { ...s.orders[rxId], items } } };
        });
      },

      addCatalogOrder: (encounterId, catalogId) => {
        const catalog = getCatalog().find((c) => c.id === catalogId);
        if (!catalog || catalog.type === "consult") return; // the base consult line is automatic, never orderable here
        set((s) => {
          const e = s.encounters[encounterId];
          if (!e) return s;
          const id = nextLocalId("ord");
          const order: HcOrder = {
            id, encounter_id: encounterId, type: catalog.type as "lab" | "radiology" | "procedure",
            catalog_id: catalog.id, name_ar: catalog.name_ar, status: "pending",
            requested_at: new Date().toISOString(), result_id: null,
          };
          return {
            orders: { ...s.orders, [id]: order },
            encounters: { ...s.encounters, [encounterId]: { ...e, orders: [...e.orders, id] } },
          };
        });
      },

      addManualOrder: (encounterId, input) => {
        set((s) => {
          const e = s.encounters[encounterId];
          if (!e) return s;
          const id = nextLocalId("ord");
          const order: HcOrder = {
            id, encounter_id: encounterId, type: input.type,
            name_ar: input.name_ar, status: "pending",
            requested_at: new Date().toISOString(), result_id: null,
            price: input.price,
          };
          return {
            orders: { ...s.orders, [id]: order },
            encounters: { ...s.encounters, [encounterId]: { ...e, orders: [...e.orders, id] } },
          };
        });
      },

      removeOrder: (encounterId, orderId) => {
        set((s) => {
          const e = s.encounters[encounterId];
          if (!e) return s;
          const orders = { ...s.orders };
          delete orders[orderId];
          return { orders, encounters: { ...s.encounters, [encounterId]: { ...e, orders: e.orders.filter((o) => o !== orderId) } } };
        });
      },

      invoiceLines: (encounterId) => {
        const s = get();
        const e = s.encounters[encounterId];
        if (!e) return [];
        const catalog = getCatalog();
        const consult = catalog.find((c) => c.id === "svc_consult");
        const lines: InvoiceLine[] = [];
        if (consult) lines.push({ key: "consult", label_ar: consult.name_ar, amount: consult.price });
        for (const o of ordersOf(s.orders, encounterId)) {
          if (o.type === "prescription") continue;
          if (o.catalog_id) {
            const c = catalog.find((c) => c.id === o.catalog_id);
            if (c) lines.push({ key: o.id, label_ar: c.name_ar, amount: c.price });
          } else if (o.price != null) {
            lines.push({ key: o.id, label_ar: o.name_ar, amount: o.price });
          }
        }
        return lines;
      },

      // Gate for "إنهاء الزيارة" (spec §4.2/§4.4): the auto consult line alone
      // doesn't count — Finish needs an actual clinical action (a diagnosis
      // written, or at least one ordered test/procedure).
      canFinish: (encounterId) => {
        const s = get();
        const e = s.encounters[encounterId];
        if (!e) return false;
        const hasDiagnosis = !!e.diagnosis && e.diagnosis.trim().length > 0;
        const hasOrderedLine = ordersOf(s.orders, encounterId).some((o) => o.type !== "prescription");
        return hasDiagnosis || hasOrderedLine;
      },

      finishVisit: (encounterId) => {
        const s = get();
        if (!s.canFinish(encounterId)) return { ok: false };
        const e = s.encounters[encounterId];
        const patient = getPatient(e.patient_id);
        const plan = patient?.insurance ? getPlan(patient.insurance.plan_id) : undefined;
        const lines = s.invoiceLines(encounterId);
        const total = round2(lines.reduce((sum, l) => sum + l.amount, 0));
        const split = computeInsuranceSplit(total, plan);
        const invoiceId = nextLocalId("inv");
        const invoice: HcInvoice = {
          id: invoiceId,
          encounter_id: encounterId,
          patient_id: e.patient_id,
          total,
          insured: split.insured,
          plan_id: plan?.id ?? null,
          patient_portion: split.patient_portion,
          insurer_portion: split.insurer_portion,
          split_note: split.split_note_ar,
          eta_route: "b2c_receipt",
          collected: false,
        };

        set((st) => ({
          invoices: { ...st.invoices, [invoiceId]: invoice },
          encounters: { ...st.encounters, [encounterId]: { ...e, status: "completed", invoice_id: invoiceId } },
          sync: { ...st.sync, [encounterId]: "local" },
        }));

        // Same local→syncing→synced simulation as the Today Board store — holds
        // at "local" (queued) under ?mock=offline instead of round-tripping.
        if (!isOfflineMock()) {
          setTimeout(() => {
            set((st) => ({ sync: { ...st.sync, [encounterId]: "syncing" } }));
            setTimeout(() => {
              set((st) => ({ sync: { ...st.sync, [encounterId]: "synced" } }));
            }, 600);
          }, 400);
        }

        return { ok: true, invoice };
      },

      enterResult: (orderId, input) => {
        const s = get();
        const order = s.orders[orderId];
        if (!order) return;
        const resultId = order.result_id ?? nextLocalId("res");
        const result: HcResult = {
          id: resultId, order_id: orderId, value: input.value,
          attachment: input.attachment, note: input.note,
          status: "ready", ready_at: new Date().toISOString(),
        };
        set((st) => ({
          results: { ...st.results, [resultId]: result },
          orders: { ...st.orders, [orderId]: { ...order, status: "ready", result_id: resultId } },
          resultSync: { ...st.resultSync, [orderId]: "local" },
        }));

        // Same local→syncing→synced simulation used elsewhere in this store.
        if (!isOfflineMock()) {
          setTimeout(() => {
            set((st) => ({ resultSync: { ...st.resultSync, [orderId]: "syncing" } }));
            setTimeout(() => {
              set((st) => ({ resultSync: { ...st.resultSync, [orderId]: "synced" } }));
            }, 600);
          }, 400);
        }
      },

      deliverResult: (orderId) => {
        set((s) => {
          const order = s.orders[orderId];
          if (!order || !order.result_id) return s;
          const result = s.results[order.result_id];
          return {
            orders: { ...s.orders, [orderId]: { ...order, status: "delivered" } },
            results: result ? { ...s.results, [order.result_id]: { ...result, status: "delivered" } } : s.results,
          };
        });
      },
    }),
    { name: "flexova.healthcare.clinical" }
  )
);
