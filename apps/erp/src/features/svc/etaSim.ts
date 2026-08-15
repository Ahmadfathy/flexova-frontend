import type { SvcTicketEta, TicketChannel, TicketSyncStatus } from "@/stores/svcTickets";

export interface EtaSimResult {
  channel: TicketChannel;
  syncStatus: TicketSyncStatus;
  eta?: SvcTicketEta;
}

function mockUuid(): string {
  return `SVC${Math.random().toString(36).slice(2, 10).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Shallow ETA simulation matching this codebase's existing depth (POS/F&B settle never
 * actually calls a live ETA service either — `TenderModal` only ever produces "local"/"queued").
 * B2B (linked client with a valid TRN) clears near-real-time; B2C queues for the legal window.
 * `forceReject` is wired to `?mock=eta_reject` so the rejection path stays demoable/testable.
 */
export function simulateEtaSubmit(opts: { hasTrn: boolean; isOnline: boolean; forceReject: boolean }): EtaSimResult {
  const channel: TicketChannel = opts.hasTrn ? "e-invoice" : "e-receipt";

  if (opts.forceReject) {
    return {
      channel,
      syncStatus: "rejected",
      eta: {
        rejected_at: new Date().toISOString(),
        reason_ar: "بيانات العميل الضريبية غير مكتملة",
        reason_en: "Buyer tax details incomplete",
        environment: "sandbox",
      },
    };
  }

  if (!opts.isOnline) {
    const now = new Date();
    const deadline = new Date(now.getTime() + 48 * 3600 * 1000);
    return {
      channel,
      syncStatus: "queued",
      eta: {
        queued_at: now.toISOString(),
        window_deadline: deadline.toISOString(),
        window_remaining_hours: 48,
        environment: "sandbox",
      },
    };
  }

  return {
    channel,
    syncStatus: "valid",
    eta: { uuid: mockUuid(), accepted_at: new Date().toISOString(), environment: "sandbox" },
  };
}
