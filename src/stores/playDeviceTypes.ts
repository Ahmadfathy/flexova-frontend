import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDeviceTypes } from "@/lib/mock/play";
import type { DeviceType, DeviceOccupancy, PlayMode } from "@/features/play/types";

export interface SaveDeviceTypeInput {
  name_ar: string;
  name_en: string;
  occupancy: DeviceOccupancy;
  rate_plan_id: string;
  service_item_id: string;
  icon: string;
  color: string;
  play_mode_tags: PlayMode[];
}

const SEED_DEVICE_TYPES: Record<string, DeviceType> = Object.fromEntries(
  getDeviceTypes().map((dt) => [dt.id, dt])
);

let seq = 1;
function nextId(): string {
  return `dt_${Date.now()}_${seq++}`;
}

interface PlayDeviceTypesState {
  deviceTypes: Record<string, DeviceType>;
  createDeviceType: (input: SaveDeviceTypeInput) => DeviceType;
  updateDeviceType: (id: string, input: SaveDeviceTypeInput) => void;
}

export const usePlayDeviceTypes = create<PlayDeviceTypesState>()(
  persist(
    (set) => ({
      deviceTypes: SEED_DEVICE_TYPES,

      createDeviceType: (input) => {
        const dt: DeviceType = { id: nextId(), ...input };
        set((s) => ({ deviceTypes: { ...s.deviceTypes, [dt.id]: dt } }));
        return dt;
      },

      updateDeviceType: (id, input) => set((s) => {
        const existing = s.deviceTypes[id];
        if (!existing) return s;
        return { deviceTypes: { ...s.deviceTypes, [id]: { ...existing, ...input } } };
      }),
    }),
    { name: "flexova.play.deviceTypes" }
  )
);
