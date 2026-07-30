import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSectorSettings } from "@/lib/mock/play";
import type { PrepaidCafeteriaBilling, PeakCrossingNotify } from "@/features/play/types";

const SEED = getSectorSettings();

interface PlaySectorSettingsState {
  prepaidCafeteriaBilling: PrepaidCafeteriaBilling;
  peakCrossingNotify: PeakCrossingNotify;
  prepaidBlockThresholdMin: number;
  hrCommissionEnabled: boolean;
  setPrepaidCafeteriaBilling: (v: PrepaidCafeteriaBilling) => void;
  setPeakCrossingNotify: (v: PeakCrossingNotify) => void;
  setPrepaidBlockThresholdMin: (v: number) => void;
  setHrCommissionEnabled: (v: boolean) => void;
}

/** Sector settings (FE_15 §8) — seeded from play.fixtures.json's `sector_settings`, then
 * editable and persisted, same convention as `useRprSettings`. */
export const usePlaySectorSettings = create<PlaySectorSettingsState>()(
  persist(
    (set) => ({
      prepaidCafeteriaBilling: SEED.prepaid_cafeteria_billing,
      peakCrossingNotify: SEED.peak_crossing_notify,
      prepaidBlockThresholdMin: SEED.prepaid_block_threshold_min,
      hrCommissionEnabled: SEED.hr_commission_enabled,

      setPrepaidCafeteriaBilling: (v) => set({ prepaidCafeteriaBilling: v }),
      setPeakCrossingNotify: (v) => set({ peakCrossingNotify: v }),
      setPrepaidBlockThresholdMin: (v) => set({ prepaidBlockThresholdMin: v }),
      setHrCommissionEnabled: (v) => set({ hrCommissionEnabled: v }),
    }),
    { name: "flexova.play.sectorSettings" }
  )
);
