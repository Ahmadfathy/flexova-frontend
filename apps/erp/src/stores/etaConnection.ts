import { create } from "zustand";
import type { EtaConnection, EtaFlags } from "@/lib/mock/eta";

interface EtaConnectionState {
  connection: EtaConnection | null;
  flags: EtaFlags | null;
  loading: boolean;
  error: string | null;

  setConnection: (c: EtaConnection) => void;
  setFlags: (f: EtaFlags) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

/**
 * Holds the ETA connector's live state (connection status + environment + policy
 * flags) so any screen in the app can read it without re-fetching. Populated by
 * useEtaConnection() — see src/hooks/useEtaConnection.ts for the read/write API.
 */
export const useEtaConnectionStore = create<EtaConnectionState>((set) => ({
  connection: null,
  flags: null,
  loading: false,
  error: null,

  setConnection: (connection) => set({ connection }),
  setFlags: (flags) => set({ flags }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
