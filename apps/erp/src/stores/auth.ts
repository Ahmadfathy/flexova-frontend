import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  name_ar: string;
  login: string;
  roles: string[];
  twofa: boolean;
}

interface AuthState {
  user: AuthUser | null;
  /** Set while waiting for the 2FA step; NOT persisted (ephemeral). */
  pendingUserId: string | null;
  /**
   * Dev-bypass: when true the auth guard lets every route through.
   * Defaults to true so the app works out of the box without logging in.
   * Flip to false in the UI (login page dev toggle) to test the real flow.
   */
  devBypass: boolean;

  setUser(u: AuthUser): void;
  setPendingUserId(id: string | null): void;
  setDevBypass(v: boolean): void;
  logout(): void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      pendingUserId: null,
      devBypass: true,

      setUser:          (user)  => set({ user, pendingUserId: null }),
      setPendingUserId: (id)    => set({ pendingUserId: id }),
      setDevBypass:     (v)     => set({ devBypass: v }),
      logout:           ()      => set({ user: null, pendingUserId: null }),
    }),
    {
      name: "flexova.auth",
      // pendingUserId is intentionally excluded — a page refresh during 2FA
      // forces the user back to /auth/login, which is the correct UX.
      partialize: (s) => ({ user: s.user, devBypass: s.devBypass }),
    }
  )
);
