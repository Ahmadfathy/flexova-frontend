import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SETTINGS } from "@/features/repair/catalog";

interface RprSettingsState {
  diagnosisFeeEnabled: boolean;
  diagnosisFeeAmount: number;
  defaultWarrantyDays: number;
  whatsappApprovalTemplate: string;
  whatsappReadyTemplate: string;
  setDiagnosisFee: (enabled: boolean, amount: number) => void;
  setDefaultWarrantyDays: (days: number) => void;
  setWhatsappTemplates: (approval: string, ready: string) => void;
}

/** Workshop settings (FE_12 §7) — seeded from the static fixture `SETTINGS`, then editable
 * and persisted, same convention as `usePosTerminalSettings`. Numbering (prefix/next) stays
 * derived from `rprWorkOrders`'s own counter — not duplicated here. */
export const useRprSettings = create<RprSettingsState>()(
  persist(
    (set) => ({
      diagnosisFeeEnabled: SETTINGS.diagnosis_fee.enabled,
      diagnosisFeeAmount: SETTINGS.diagnosis_fee.amount,
      defaultWarrantyDays: SETTINGS.default_warranty_days,
      whatsappApprovalTemplate: SETTINGS.whatsapp_templates.approval_request,
      whatsappReadyTemplate: SETTINGS.whatsapp_templates.ready_notice,

      setDiagnosisFee: (enabled, amount) => set({ diagnosisFeeEnabled: enabled, diagnosisFeeAmount: amount }),
      setDefaultWarrantyDays: (days) => set({ defaultWarrantyDays: days }),
      setWhatsappTemplates: (approval, ready) => set({ whatsappApprovalTemplate: approval, whatsappReadyTemplate: ready }),
    }),
    { name: "flexova.repair.settings" }
  )
);
