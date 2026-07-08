import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  WORK_ORDERS, SETTINGS,
  type RprWorkOrder, type RprDeviceType, type RprDeposit,
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
    }),
    { name: "flexova.repair.workOrders" }
  )
);
