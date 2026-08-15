import { useState, useEffect, useCallback } from "react";
import { mockFetch, loadFixture } from "@/lib/mock/client";

// ── Types ─────────────────────────────────────────────────────────

export interface Branch {
  id:      string;
  name_ar: string;
  name_en: string;
  code:    string;
}

export interface Scope {
  branches: "all" | string[];
  row_rule: "all" | "branch" | "own";
}

export interface AdminUser {
  id:          string;
  name_ar:     string;
  login:       string;
  roles:       string[];
  scope:       Scope;
  status:      "active" | "suspended";
  twofa:       boolean;
  last_login:  string;
  is_last_admin?: boolean;
}

export interface RoleTemplate {
  id:          string;
  name_ar:     string;
  name_en:     string;
  template:    boolean;
  user_count:  number;
  permissions: string[] | "*";
  exclude?:    string[];
  scope:       Scope;
}

export type PermissionCatalog = Record<string, string[]>;

export interface Session {
  id:      string;
  user_id: string;
  device:  string;
  ip:      string;
  started: string;
  current: boolean;
}

export interface SecurityPolicy {
  password: {
    min_length:       number;
    require_number:   boolean;
    require_symbol:   boolean;
  };
  twofa: {
    available: boolean;
    enforced:  boolean;
  };
  session_timeout_minutes: number;
  trusted_devices:         boolean;
}

export interface AuditEntry {
  id:         string;
  user_id:    string;
  action:     string;
  sensitive:  boolean;
  when:       string;
  branch_id:  string | null;
  target:     string;
  summary_ar: string;
}

export interface LastAdminLock {
  user_id:   string;
  rule:      string;
  reason_ar: string;
}

export interface AdminData {
  branches:          Branch[];
  permissionCatalog: PermissionCatalog;
  roleTemplates:     RoleTemplate[];
  users:             AdminUser[];
  sessions:          Session[];
  securityPolicy:    SecurityPolicy;
  auditLog:          AuditEntry[];
  lastAdminLock:     LastAdminLock;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useAdminData() {
  const [data, setData]           = useState<AdminData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setIsOffline(false);
    try {
      const result = await mockFetch(
        () => loadFixture<Record<string, unknown>>("permissions"),
        null,
      );
      const r = result as any;
      setData({
        branches:          r.branches           ?? [],
        permissionCatalog: r.permission_catalog ?? {},
        roleTemplates:     r.role_templates     ?? [],
        users:             r.users              ?? [],
        sessions:          r.sessions           ?? [],
        securityPolicy:    r.security_policy    ?? {},
        auditLog:          r.audit_log          ?? [],
        lastAdminLock:     r.last_admin_lock    ?? {},
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "mock_offline") setIsOffline(true);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, isOffline, reload: load };
}
