import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDevices } from "@/lib/mock/play";
import type { Device, DeviceState } from "@/features/play/types";

export interface SaveDeviceInput {
  name: string;
  device_type_id: string;
  branch_id: string;
  state: DeviceState;
  notes: string;
}

export interface BulkAddDevicesInput {
  prefix: string;
  start: number;
  count: number;
  device_type_id: string;
  branch_id: string;
}

/** Upper bound on a single bulk-add batch — sane guardrail, not a fixture/spec value. */
export const MAX_BULK_COUNT = 50;

const SEED_DEVICES: Record<string, Device> = Object.fromEntries(
  getDevices().map((d) => [d.id, d])
);

let seq = 1;
function nextId(): string {
  return `dev_${Date.now()}_${seq++}`;
}

interface PlayDevicesState {
  devices: Record<string, Device>;
  createDevice: (input: SaveDeviceInput) => Device;
  updateDevice: (id: string, input: SaveDeviceInput) => void;
  /** Generates `count` devices named `${prefix}-${n}` for n = start..start+count-1. */
  bulkAddDevices: (input: BulkAddDevicesInput) => Device[];
}

export const usePlayDevices = create<PlayDevicesState>()(
  persist(
    (set) => ({
      devices: SEED_DEVICES,

      createDevice: (input) => {
        const dev: Device = { id: nextId(), ...input };
        set((s) => ({ devices: { ...s.devices, [dev.id]: dev } }));
        return dev;
      },

      updateDevice: (id, input) => set((s) => {
        const existing = s.devices[id];
        if (!existing) return s;
        return { devices: { ...s.devices, [id]: { ...existing, ...input } } };
      }),

      bulkAddDevices: (input) => {
        const created: Device[] = [];
        set((s) => {
          const next = { ...s.devices };
          for (let i = 0; i < input.count; i++) {
            const dev: Device = {
              id: nextId(),
              name: `${input.prefix}-${input.start + i}`,
              device_type_id: input.device_type_id,
              branch_id: input.branch_id,
              state: "free",
              notes: "",
            };
            next[dev.id] = dev;
            created.push(dev);
          }
          return { devices: next };
        });
        return created;
      },
    }),
    { name: "flexova.play.devices" }
  )
);
