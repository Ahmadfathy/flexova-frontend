import { loadFixture } from "./client";
import type { AuthUser } from "@/stores/auth";

interface PermissionsFixture {
  users: Array<{
    id: string;
    name_ar: string;
    login: string;
    roles: string[];
    scope: Record<string, unknown>;
    status: string;
    twofa: boolean;
    last_login: string;
    is_last_admin?: boolean;
  }>;
  security_policy: {
    password: { min_length: number; require_number: boolean; require_symbol: boolean };
    twofa: { available: boolean; enforced: boolean };
    session_timeout_minutes: number;
    trusted_devices: boolean;
  };
}

export type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; requires2FA: true; userId: string }
  | { ok: false; error: "invalid_credentials" | "suspended" | "generic" };

/** Artificial delay to simulate a network round-trip. */
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function mockLogin(login: string, _password: string): Promise<LoginResult> {
  await delay(700);
  try {
    const fixture = await loadFixture<PermissionsFixture>("permissions");
    const user = fixture.users.find((u) => u.login === login);

    if (!user) return { ok: false, error: "invalid_credentials" };
    if (user.status === "suspended") return { ok: false, error: "suspended" };

    const authUser: AuthUser = {
      id: user.id,
      name_ar: user.name_ar,
      login: user.login,
      roles: user.roles,
      twofa: user.twofa,
    };

    if (user.twofa) {
      return { ok: false, requires2FA: true, userId: user.id };
    }

    return { ok: true, user: authUser };
  } catch {
    return { ok: false, error: "generic" };
  }
}

/** Mock 2FA verification — any 6-digit code is accepted. */
export async function mockVerify2FA(code: string): Promise<boolean> {
  await delay(500);
  return /^\d{6}$/.test(code);
}

export async function mockGetUserById(userId: string): Promise<AuthUser | null> {
  try {
    const fixture = await loadFixture<PermissionsFixture>("permissions");
    const user = fixture.users.find((u) => u.id === userId);
    if (!user) return null;
    return {
      id: user.id,
      name_ar: user.name_ar,
      login: user.login,
      roles: user.roles,
      twofa: user.twofa,
    };
  } catch {
    return null;
  }
}

/** Mock forgot-password: always succeeds (simulates sending a code). */
export async function mockRequestPasswordReset(_login: string): Promise<boolean> {
  await delay(700);
  return true;
}

/** Mock set/reset password: always succeeds. */
export async function mockSetPassword(
  _newPassword: string
): Promise<boolean> {
  await delay(600);
  return true;
}
