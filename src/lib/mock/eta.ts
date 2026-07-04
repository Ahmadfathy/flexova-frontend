import { loadFixture } from "./client";

export type EtaConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
export type EtaEnvironment = "sandbox" | "production";
export type EtaBlockPolicy = "draft_only" | "full_block" | "warn_only";
export type EtaConnectEntrypoint = "settings" | "banner" | "hub";
export type EtaConnectionScope = "tenant" | "branch";

export interface EtaConnection {
  id: string;
  scope: EtaConnectionScope;
  scope_id: string;
  environment: EtaEnvironment;
  status: EtaConnectionStatus;
  trn: string | null;
  e_seal_ref: string | null;
  last_tested_at: string | null;
  last_error_ar: string | null;
  last_error_en: string | null;
}

export interface EtaFlags {
  block_policy: EtaBlockPolicy;
  connect_entrypoints: EtaConnectEntrypoint[];
  connection_scope: EtaConnectionScope;
}

export interface EtaConnectPayload {
  trn: string;
  credentials: Record<string, unknown>;
  environment: EtaEnvironment;
}

interface EtaConnectionFixture {
  eta_connection: EtaConnection;
  eta_flags: EtaFlags;
  mock_variants: Record<EtaConnectionStatus, Partial<EtaConnection>>;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** ?eta=<state> forces a connection state for demo/QA without running the wizard. */
function statusOverride(): EtaConnectionStatus | null {
  const val = new URLSearchParams(window.location.search).get("eta");
  if (val === "disconnected" || val === "connecting" || val === "connected" || val === "error") return val;
  return null;
}

// Session-scoped mutable copy — mimics per-tenant server state until a real API backs this.
let session: { connection: EtaConnection; flags: EtaFlags } | null = null;

async function getSession(): Promise<{ connection: EtaConnection; flags: EtaFlags }> {
  if (session) return session;
  const fixture = await loadFixture<EtaConnectionFixture>("eta-connection");
  const override = statusOverride();
  const connection = override
    ? { ...fixture.eta_connection, ...fixture.mock_variants[override] }
    : fixture.eta_connection;
  session = { connection, flags: fixture.eta_flags };
  return session;
}

/** GET connection — mirrors Backend Plan §6 `eta_connection` read endpoint. */
export async function getConnection(): Promise<EtaConnection> {
  await delay(400);
  const s = await getSession();
  return s.connection;
}

/** POST connect — TRN + credentials + environment; resolves to connected (or error, via ?eta=error). */
export async function connect(payload: EtaConnectPayload): Promise<EtaConnection> {
  await delay(1400);
  const s = await getSession();
  const fixture = await loadFixture<EtaConnectionFixture>("eta-connection");
  const override = statusOverride();

  const variant = override === "error" ? fixture.mock_variants.error : fixture.mock_variants.connected;
  s.connection = { ...s.connection, ...variant, trn: payload.trn, environment: payload.environment };
  return s.connection;
}

/**
 * POST test — re-checks the current connection; same success/error shape as connect().
 * Optional `environment` lets the settings screen switch sandbox/production and
 * re-test in one call, without re-collecting TRN/credentials.
 */
export async function testConnection(environment?: EtaEnvironment): Promise<EtaConnection> {
  await delay(1000);
  const s = await getSession();
  const fixture = await loadFixture<EtaConnectionFixture>("eta-connection");
  const override = statusOverride();

  const variant = override === "error" ? fixture.mock_variants.error : fixture.mock_variants.connected;
  s.connection = {
    ...s.connection,
    ...variant,
    environment: environment ?? s.connection.environment,
    last_tested_at: new Date().toISOString(),
  };
  return s.connection;
}

/** POST reconnect — same signature/flow as connect(), used from the error state. */
export async function reconnect(payload: EtaConnectPayload): Promise<EtaConnection> {
  return connect(payload);
}

/** GET settings — the 3 policy flags. */
export async function getSettings(): Promise<EtaFlags> {
  await delay(300);
  const s = await getSession();
  return s.flags;
}

/** PATCH settings — partial update of the policy flags. */
export async function patchSettings(patch: Partial<EtaFlags>): Promise<EtaFlags> {
  await delay(500);
  const s = await getSession();
  s.flags = { ...s.flags, ...patch };
  return s.flags;
}
