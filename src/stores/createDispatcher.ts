import { create } from "zustand";

interface CreateDispatcherState {
  /** entityKey of the create-modal/drawer currently mounted, or null when closed. */
  activeKey: string | null;
  /** Optional context passed to the active create form (e.g. a source record id). */
  params?: Record<string, unknown>;
  openCreate: (key: string, params?: Record<string, unknown>) => void;
  closeCreate: () => void;
}

/**
 * Global create dispatcher — lets any component (Quick-Add, a list page's own
 * "+ New" button, etc.) open a create modal/drawer that mounts once at the
 * app-shell level, so it renders over whatever page is currently active
 * instead of forcing navigation.
 */
export const useCreateDispatcher = create<CreateDispatcherState>((set) => ({
  activeKey: null,
  params: undefined,
  openCreate: (key, params) => set({ activeKey: key, params }),
  closeCreate: () => set({ activeKey: null, params: undefined }),
}));
