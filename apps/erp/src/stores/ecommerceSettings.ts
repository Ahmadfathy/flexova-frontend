import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getStoreConfig, getShippingZones } from "@/lib/mock/ecommerce";
import type { EcStoreConfig, EcShippingZone, PaymentGatewayConfig, GatewayId } from "@/features/ecommerce/types";

/**
 * Settings local state (spec §7 payments/shipping + §8 StoreConfig/theme).
 * Seeded once from the fixture; every write here is local-only (mock — a
 * real backend persists `activeTheme` and the storefront reads it
 * server-side on its next render, same architecture the Storefront app's
 * own `getActiveTheme()` already documents as its eventual real source,
 * currently only overridable there via `ACTIVE_THEME` env for demoing).
 */

let zoneSeq = 1;

const DEFAULT_CARRIERS = ["بوسطة", "أرامكس", "DHL"];

function seedGateways(): PaymentGatewayConfig[] {
  const enabled = new Set(getStoreConfig().payment_gateway);
  const all: GatewayId[] = ["paymob", "fawry", "cod"];
  return all.map((id) => ({ id, enabled: enabled.has(id), connected: enabled.has(id) }));
}

interface EcommerceSettingsState {
  storeConfig: EcStoreConfig;
  shippingZones: EcShippingZone[];
  carriers: string[];
  gateways: PaymentGatewayConfig[];

  updateStoreConfig: (patch: Partial<EcStoreConfig>) => void;
  /** spec §8 "sets activeTheme → resolved server-side (no FOUC) ·
   * touches no data/products". */
  setActiveTheme: (theme: string) => void;

  toggleGateway: (id: GatewayId) => void;

  addShippingZone: (input: Omit<EcShippingZone, "id">) => void;
  updateShippingZone: (id: string, patch: Partial<Omit<EcShippingZone, "id">>) => void;
  removeShippingZone: (id: string) => void;

  addCarrier: (name: string) => void;
  removeCarrier: (name: string) => void;
}

export const useEcommerceSettings = create<EcommerceSettingsState>()(
  persist(
    (set) => ({
      storeConfig: getStoreConfig(),
      shippingZones: getShippingZones(),
      carriers: DEFAULT_CARRIERS,
      gateways: seedGateways(),

      updateStoreConfig: (patch) => set((s) => ({ storeConfig: { ...s.storeConfig, ...patch } })),

      setActiveTheme: (theme) => set((s) => ({ storeConfig: { ...s.storeConfig, active_theme: theme } })),

      toggleGateway: (id) =>
        set((s) => ({
          gateways: s.gateways.map((g) => (g.id === id ? { ...g, enabled: !g.enabled, connected: !g.enabled } : g)),
        })),

      addShippingZone: (input) => {
        const id = `z_new_${zoneSeq++}`;
        set((s) => ({ shippingZones: [...s.shippingZones, { ...input, id }] }));
      },
      updateShippingZone: (id, patch) =>
        set((s) => ({ shippingZones: s.shippingZones.map((z) => (z.id === id ? { ...z, ...patch } : z)) })),
      removeShippingZone: (id) => set((s) => ({ shippingZones: s.shippingZones.filter((z) => z.id !== id) })),

      addCarrier: (name) =>
        set((s) => (s.carriers.includes(name) ? s : { carriers: [...s.carriers, name] })),
      removeCarrier: (name) => set((s) => ({ carriers: s.carriers.filter((c) => c !== name) })),
    }),
    {
      name: "flexova.ecommerce.settings",
      partialize: (s) => ({ storeConfig: s.storeConfig, shippingZones: s.shippingZones, carriers: s.carriers, gateways: s.gateways }),
    }
  )
);
