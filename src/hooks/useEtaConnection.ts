import { useCallback, useEffect, useRef } from "react";
import { useEtaConnectionStore } from "@/stores/etaConnection";
import * as etaService from "@/lib/mock/eta";
import type {
  EtaBlockPolicy,
  EtaConnectPayload,
  EtaConnection,
  EtaConnectionStatus,
  EtaEnvironment,
  EtaFlags,
} from "@/lib/mock/eta";

function computeCanIssue(status: EtaConnectionStatus, policy: EtaBlockPolicy): boolean {
  switch (policy) {
    case "warn_only":
      // Always allowed — the caller is expected to show a warning, not block.
      return true;
    case "full_block":
    case "draft_only":
    default:
      // Both policies gate issue/submit the same way; they differ on whether
      // *drafts* are blocked too, which is a decision for the caller to make.
      return status === "connected";
  }
}

export interface UseEtaConnectionResult {
  connection: EtaConnection | null;
  flags: EtaFlags | null;
  status: EtaConnectionStatus;
  environment: EtaEnvironment;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  canIssue: boolean;
  connect: (payload: EtaConnectPayload) => Promise<void>;
  test: (environment?: EtaEnvironment) => Promise<void>;
  reconnect: (payload: EtaConnectPayload) => Promise<void>;
  patchSettings: (patch: Partial<EtaFlags>) => Promise<void>;
  reload: () => Promise<void>;
}

/** Global read/write access to the ETA connector's state — the whole app reads through this. */
export function useEtaConnection(): UseEtaConnectionResult {
  const connection = useEtaConnectionStore((s) => s.connection);
  const flags = useEtaConnectionStore((s) => s.flags);
  const loading = useEtaConnectionStore((s) => s.loading);
  const error = useEtaConnectionStore((s) => s.error);
  const setConnection = useEtaConnectionStore((s) => s.setConnection);
  const setFlags = useEtaConnectionStore((s) => s.setFlags);
  const setLoading = useEtaConnectionStore((s) => s.setLoading);
  const setError = useEtaConnectionStore((s) => s.setError);

  const hydrated = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [conn, settings] = await Promise.all([
        etaService.getConnection(),
        etaService.getSettings(),
      ]);
      setConnection(conn);
      setFlags(settings);
    } catch {
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  }, [setConnection, setFlags, setLoading, setError]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void reload();
  }, [reload]);

  const connect = useCallback(async (payload: EtaConnectPayload) => {
    setError(null);
    setConnection({
      ...(connection ?? {
        id: "", scope: "tenant", scope_id: "", environment: payload.environment,
        trn: null, e_seal_ref: null, last_tested_at: null, last_error_ar: null, last_error_en: null,
      }),
      status: "connecting",
      environment: payload.environment,
    });
    try {
      const result = await etaService.connect(payload);
      setConnection(result);
    } catch {
      setError("connect_failed");
    }
  }, [connection, setConnection, setError]);

  const test = useCallback(async (environment?: EtaEnvironment) => {
    setError(null);
    try {
      const result = await etaService.testConnection(environment);
      setConnection(result);
    } catch {
      setError("test_failed");
    }
  }, [setConnection, setError]);

  const reconnect = useCallback(async (payload: EtaConnectPayload) => {
    setError(null);
    if (connection) setConnection({ ...connection, status: "connecting" });
    try {
      const result = await etaService.reconnect(payload);
      setConnection(result);
    } catch {
      setError("reconnect_failed");
    }
  }, [connection, setConnection, setError]);

  const patchSettings = useCallback(async (patch: Partial<EtaFlags>) => {
    const result = await etaService.patchSettings(patch);
    setFlags(result);
  }, [setFlags]);

  const status: EtaConnectionStatus = connection?.status ?? "disconnected";
  const environment: EtaEnvironment = connection?.environment ?? "sandbox";
  const blockPolicy: EtaBlockPolicy = flags?.block_policy ?? "draft_only";

  return {
    connection,
    flags,
    status,
    environment,
    loading,
    error,
    isConnected: status === "connected",
    canIssue: computeCanIssue(status, blockPolicy),
    connect,
    test,
    reconnect,
    patchSettings,
    reload,
  };
}
