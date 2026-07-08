import { useAuthStore } from "@/stores/auth";
import permissionsFixtures from "@/lib/mock/fixtures/permissions.fixtures.json";

interface RoleTemplate {
  id: string;
  permissions: string | string[];
  exclude?: string[];
  scope: { branches: string[] | "all"; row_rule: string };
}

interface PermissionUser {
  id: string;
  roles: string[];
  scope: { branches: string[] | "all"; row_rule: string };
}

const ROLES = permissionsFixtures.role_templates as RoleTemplate[];
const USERS = permissionsFixtures.users as PermissionUser[];

/** `"svc.*"` and `"*"` grant `"svc.subscription.manage"`; an exact match always does. */
function matchesGrant(key: string, grant: string): boolean {
  if (grant === "*" || grant === key) return true;
  if (grant.endsWith(".*")) return key.startsWith(grant.slice(0, -1));
  return false;
}

function grants(key: string, permissions: string | string[]): boolean {
  if (permissions === "*") return true;
  return (permissions as string[]).some((g) => matchesGrant(key, g));
}

function inBranchScope(branches: string[] | "all", branchId: string): boolean {
  return branches === "all" || branches.includes(branchId);
}

/**
 * Real permission check (unlike the rest of the app's always-true `useCan()` stub) — resolves
 * the signed-in user's roles against `permissions.fixtures.json` role templates, with prefix
 * wildcard matching (`"svc.*"`) and `exclude` overrides, plus an optional branch-scope check.
 * No session (dev-bypass, the app's default out-of-box state) mirrors `AuthGuard`'s own
 * pass-through and grants everything, so the rest of the demo isn't gated by a login nobody did.
 */
export function useScopedCan() {
  const authUser = useAuthStore((s) => s.user);
  const devBypass = useAuthStore((s) => s.devBypass);

  return (key: string, scope?: { branchId?: string }): boolean => {
    if (!authUser) return devBypass;

    const record = USERS.find((u) => u.id === authUser.id);
    if (!record) return false;

    const granted = authUser.roles.some((roleId) => {
      const role = ROLES.find((r) => r.id === roleId);
      if (!role) return false;
      if (role.exclude?.some((x) => matchesGrant(key, x))) return false;
      return grants(key, role.permissions);
    });
    if (!granted) return false;

    if (scope?.branchId) return inBranchScope(record.scope.branches, scope.branchId);
    return true;
  };
}
