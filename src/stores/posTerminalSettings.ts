import { create } from "zustand";
import { persist } from "zustand/middleware";
import posFixtures from "@/lib/mock/fixtures/pos.fixtures.json";

const CURRENT_TERMINAL = posFixtures.terminals[0];

export type HardwareKey = "printer" | "drawer" | "scanner" | "scale";

interface PosTerminalSettingsState {
  hardwareBound: Record<HardwareKey, boolean>;
  lastTestedAt: Record<HardwareKey, string | null>;
  defaultWarehouseId: string;
  defaultPriceListId: string;
  etaDeviceActivated: boolean;
  etaAccessToken: string | null;

  toggleHardware: (key: HardwareKey) => void;
  testHardware: (key: HardwareKey) => void;
  setDefaultWarehouse: (id: string) => void;
  setDefaultPriceList: (id: string) => void;
  activateEtaDevice: () => void;
  deactivateEtaDevice: () => void;
  regenerateEtaToken: () => void;
}

function mockToken() {
  return `pos_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export const usePosTerminalSettings = create<PosTerminalSettingsState>()(
  persist(
    (set) => ({
      hardwareBound: {
        printer: !!CURRENT_TERMINAL.hardware.printer,
        drawer: !!CURRENT_TERMINAL.hardware.drawer,
        scanner: !!CURRENT_TERMINAL.hardware.scanner,
        scale: !!CURRENT_TERMINAL.hardware.scale,
      },
      lastTestedAt: { printer: null, drawer: null, scanner: null, scale: null },
      defaultWarehouseId: CURRENT_TERMINAL.warehouse_id,
      defaultPriceListId: CURRENT_TERMINAL.price_list_id,
      etaDeviceActivated: false,
      etaAccessToken: null,

      toggleHardware: (key) => set((s) => ({
        hardwareBound: { ...s.hardwareBound, [key]: !s.hardwareBound[key] },
      })),

      testHardware: (key) => set((s) => ({
        lastTestedAt: { ...s.lastTestedAt, [key]: new Date().toISOString() },
      })),

      setDefaultWarehouse: (id) => set({ defaultWarehouseId: id }),
      setDefaultPriceList: (id) => set({ defaultPriceListId: id }),

      activateEtaDevice: () => set({ etaDeviceActivated: true, etaAccessToken: mockToken() }),
      deactivateEtaDevice: () => set({ etaDeviceActivated: false, etaAccessToken: null }),
      regenerateEtaToken: () => set({ etaAccessToken: mockToken() }),
    }),
    { name: "flexova.pos.terminalSettings" }
  )
);

export { CURRENT_TERMINAL };
