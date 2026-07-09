import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  WORK_ORDERS, SETTINGS, computeQuoteTotal,
  type RprWorkOrder, type RprDeviceType, type RprDeposit, type RprDiagnosis,
  type RprQuotePartLine, type RprQuoteLaborLine, type RprApprovalChannel,
  type RprPartLine, type RprLaborLine,
} from "@/features/repair/catalog";

const SEED_WORK_ORDERS = WORK_ORDERS.reduce<Record<string, RprWorkOrder>>((acc, wo) => {
  acc[wo.id] = wo;
  return acc;
}, {});

export interface CreateDeviceInput {
  type: RprDeviceType;
  brand: string;
  model: string;
  serial: string | null;
  intake_condition: string;
  accessories: string[];
  photos: string[];
  chassis?: string;
  plate?: string;
  odometer?: number;
}

export interface CreateWorkOrderInput {
  customer_id: string;
  technician_id: string;
  device: CreateDeviceInput;
  reported_faults: string;
  deposit: { amount: number; treasury_id: string } | null;
  promise_at: string;
  notes?: string;
}

let woSeq = 1;

interface RprWorkOrdersState {
  workOrders: Record<string, RprWorkOrder>;
  nextNumber: number;
  /** Creates a new Work Order at `pending_diagnosis` (intake). Device without a
   * serial is accepted + flagged (flag-don't-block, FE_12 golden rule #3). */
  createWorkOrder: (input: CreateWorkOrderInput) => RprWorkOrder;

  /** Diagnosis result + proposed work — no status change (status only moves on send/approve/reject). */
  saveDiagnosis: (id: string, diagnosis: RprDiagnosis) => void;

  /** Quote is composed incrementally (estimate lines, no stock effect) before being sent. */
  addQuotePartLine: (id: string, line: RprQuotePartLine) => void;
  removeQuotePartLine: (id: string, index: number) => void;
  addQuoteLaborLine: (id: string, line: RprQuoteLaborLine) => void;
  removeQuoteLaborLine: (id: string, index: number) => void;
  /** Locks the composed quote and sends it → status `pending_approval`. */
  sendQuoteForApproval: (id: string, channel: RprApprovalChannel) => void;
  /** Customer approved → status `in_progress` (needs `repair.quote.approve`, sensitive). */
  approveQuote: (id: string) => void;
  /** Customer rejected → status `rejected`, device released as-is, optional diagnosis fee. */
  rejectWorkOrder: (id: string, opts: { chargeDiagnosisFee: boolean }) => void;

  /** Actual consumption — real stock deduction happens in the caller (useRprPartsStock),
   * this only appends the line (mirrors F&B/svc's "no cross-store calls" convention). */
  addExecutionPartLine: (id: string, line: RprPartLine) => void;
  addExecutionLaborLine: (id: string, line: RprLaborLine) => void;

  /** Ready for pickup — enables Deliver. */
  markReady: (id: string) => void;
}

function patchWo(
  workOrders: Record<string, RprWorkOrder>,
  id: string,
  patch: Partial<RprWorkOrder>
): Record<string, RprWorkOrder> {
  const wo = workOrders[id];
  if (!wo) return workOrders;
  return { ...workOrders, [id]: { ...wo, ...patch } };
}

export const useRprWorkOrders = create<RprWorkOrdersState>()(
  persist(
    (set, get) => ({
      workOrders: SEED_WORK_ORDERS,
      nextNumber: SETTINGS.wo_numbering.next,

      createWorkOrder: (input) => {
        const now = new Date().toISOString().slice(0, 10);
        const number = `${SETTINGS.wo_numbering.prefix}${get().nextNumber}`;
        const wo: RprWorkOrder = {
          id: `wo_${Date.now()}_${woSeq++}`,
          number,
          status: "pending_diagnosis",
          customer_id: input.customer_id,
          technician_id: input.technician_id,
          device: {
            ...input.device,
            customer_id: input.customer_id,
            ...(input.device.serial ? {} : { _flag: "device_no_serial" as const }),
          },
          reported_faults: input.reported_faults,
          diagnosis: null,
          quote: null,
          part_lines: [],
          labor_lines: [],
          deposit: input.deposit
            ? { amount: input.deposit.amount, treasury_id: input.deposit.treasury_id, taken_at: now } as RprDeposit
            : null,
          warranty_days: SETTINGS.default_warranty_days,
          original_wo_id: null,
          final_doc_id: null,
          intake_at: now,
          promise_at: input.promise_at,
          ready_at: null,
          delivered_at: null,
          notes: input.notes ?? "",
        };

        set((s) => ({
          workOrders: { ...s.workOrders, [wo.id]: wo },
          nextNumber: s.nextNumber + 1,
        }));

        return wo;
      },

      saveDiagnosis: (id, diagnosis) => set((s) => ({ workOrders: patchWo(s.workOrders, id, { diagnosis }) })),

      addQuotePartLine: (id, line) => set((s) => {
        const wo = s.workOrders[id];
        if (!wo) return s;
        const base = wo.quote ?? { part_lines: [], labor_lines: [], total: 0, approval_status: "pending" as const, approval_channel: "in_person" as const };
        const part_lines = [...base.part_lines, line];
        const total = computeQuoteTotal(part_lines, base.labor_lines);
        return { workOrders: patchWo(s.workOrders, id, { quote: { ...base, part_lines, total } }) };
      }),

      removeQuotePartLine: (id, index) => set((s) => {
        const wo = s.workOrders[id];
        if (!wo?.quote) return s;
        const part_lines = wo.quote.part_lines.filter((_, i) => i !== index);
        const total = computeQuoteTotal(part_lines, wo.quote.labor_lines);
        return { workOrders: patchWo(s.workOrders, id, { quote: { ...wo.quote, part_lines, total } }) };
      }),

      addQuoteLaborLine: (id, line) => set((s) => {
        const wo = s.workOrders[id];
        if (!wo) return s;
        const base = wo.quote ?? { part_lines: [], labor_lines: [], total: 0, approval_status: "pending" as const, approval_channel: "in_person" as const };
        const labor_lines = [...base.labor_lines, line];
        const total = computeQuoteTotal(base.part_lines, labor_lines);
        return { workOrders: patchWo(s.workOrders, id, { quote: { ...base, labor_lines, total } }) };
      }),

      removeQuoteLaborLine: (id, index) => set((s) => {
        const wo = s.workOrders[id];
        if (!wo?.quote) return s;
        const labor_lines = wo.quote.labor_lines.filter((_, i) => i !== index);
        const total = computeQuoteTotal(wo.quote.part_lines, labor_lines);
        return { workOrders: patchWo(s.workOrders, id, { quote: { ...wo.quote, labor_lines, total } }) };
      }),

      sendQuoteForApproval: (id, channel) => set((s) => {
        const wo = s.workOrders[id];
        if (!wo?.quote) return s;
        const now = new Date().toISOString().slice(0, 10);
        return {
          workOrders: patchWo(s.workOrders, id, {
            status: "pending_approval",
            quote: { ...wo.quote, approval_channel: channel, approval_status: "pending", sent_at: now },
          }),
        };
      }),

      approveQuote: (id) => set((s) => {
        const wo = s.workOrders[id];
        if (!wo?.quote) return s;
        const now = new Date().toISOString().slice(0, 10);
        return {
          workOrders: patchWo(s.workOrders, id, {
            status: "in_progress",
            quote: { ...wo.quote, approval_status: "approved", approved_at: now },
          }),
        };
      }),

      rejectWorkOrder: (id, opts) => set((s) => {
        const wo = s.workOrders[id];
        if (!wo) return s;
        const now = new Date().toISOString().slice(0, 10);
        return {
          workOrders: patchWo(s.workOrders, id, {
            status: "rejected",
            quote: wo.quote ? { ...wo.quote, approval_status: "rejected", rejected_at: now } : wo.quote,
            diagnosis_fee: opts.chargeDiagnosisFee
              ? { amount: SETTINGS.diagnosis_fee.amount, charged: true }
              : wo.diagnosis_fee,
          }),
        };
      }),

      addExecutionPartLine: (id, line) => set((s) => {
        const wo = s.workOrders[id];
        if (!wo) return s;
        return { workOrders: patchWo(s.workOrders, id, { part_lines: [...wo.part_lines, line] }) };
      }),

      addExecutionLaborLine: (id, line) => set((s) => {
        const wo = s.workOrders[id];
        if (!wo) return s;
        return { workOrders: patchWo(s.workOrders, id, { labor_lines: [...wo.labor_lines, line] }) };
      }),

      markReady: (id) => set((s) => {
        const now = new Date().toISOString().slice(0, 10);
        return { workOrders: patchWo(s.workOrders, id, { status: "ready", ready_at: now }) };
      }),
    }),
    { name: "flexova.repair.workOrders" }
  )
);
