import { create } from "zustand";
import { persist } from "zustand/middleware";
import svcFixtures from "@/lib/mock/fixtures/svc.fixtures.json";

export type PackageStatus = "active" | "expired" | "used-up";

export interface SvcPackage {
  id: string;
  client_id: string;
  name_ar: string;
  name_en: string;
  service_id: string;
  total_sessions: number;
  used: number;
  remaining: number;
  valid_until: string;
  status: PackageStatus;
  price_paid: number;
}

const SEED_PACKAGES = (svcFixtures.packages as SvcPackage[]).reduce<Record<string, SvcPackage>>(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {}
);

interface SvcPackagesState {
  packages: Record<string, SvcPackage>;
  /**
   * Decrements one session from a package balance (an appointment completing as
   * package-covered). Returns false — no-op — if the package is missing or already
   * at zero remaining (can't cover); the caller must not charge in that case either.
   */
  useSession: (id: string) => boolean;
}

export const useSvcPackages = create<SvcPackagesState>()(
  persist(
    (set, get) => ({
      packages: SEED_PACKAGES,

      useSession: (id) => {
        const pkg = get().packages[id];
        if (!pkg || pkg.remaining <= 0) return false;

        const remaining = pkg.remaining - 1;
        set((s) => ({
          packages: {
            ...s.packages,
            [id]: { ...pkg, remaining, used: pkg.used + 1, status: remaining === 0 ? "used-up" : pkg.status },
          },
        }));
        return true;
      },
    }),
    { name: "flexova.svc.packages" }
  )
);
