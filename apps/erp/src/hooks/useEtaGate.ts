import { useTranslation } from "react-i18next";
import { useEtaConnection } from "./useEtaConnection";
import type { EtaBlockPolicy, EtaConnectEntrypoint, EtaConnectionStatus } from "@/lib/mock/eta";

export interface EtaGate {
  connStatus: EtaConnectionStatus;
  blockPolicy: EtaBlockPolicy;
  connectEntrypoints: EtaConnectEntrypoint[];
  canIssue: boolean;
  isConnected: boolean;
  isDisconnectedOrError: boolean;
  /** Connector hard-blocks the document — supersedes document-level blockers. */
  etaHardBlocked: boolean;
  /** Connector allows issuing but wants a non-blocking warning surfaced. */
  etaWarnOnly: boolean;
  /** `full_block` disables drafts too, not just issue/submit. */
  draftBlocked: boolean;
  etaNoticeTone: "danger" | "warning";
  etaNoticeText: string | null;
}

/**
 * Shared ETA connector gating for document editors (invoices, and future
 * quotations/credit-notes). Single source of truth so the readiness-panel
 * notice text/tone can't drift from the actual block_policy semantics —
 * see ETA-1 §1.3 and the three `warnings.*_blocked`/`warn_only_notice` i18n keys.
 */
export function useEtaGate(): EtaGate {
  const { t: tEta } = useTranslation("eta");
  const { status: connStatus, canIssue, flags } = useEtaConnection();

  const blockPolicy = flags?.block_policy ?? "draft_only";
  const isConnected = connStatus === "connected";
  const isDisconnectedOrError = connStatus === "disconnected" || connStatus === "error";
  const etaHardBlocked = isDisconnectedOrError && blockPolicy !== "warn_only";
  const etaWarnOnly = isDisconnectedOrError && blockPolicy === "warn_only";
  const draftBlocked = blockPolicy === "full_block" && !isConnected;

  const etaNoticeTone: "danger" | "warning" =
    blockPolicy === "full_block" && etaHardBlocked ? "danger" : "warning";
  const etaNoticeText = etaHardBlocked
    ? tEta(blockPolicy === "full_block" ? "warnings.full_block_blocked" : "warnings.draft_only_blocked")
    : etaWarnOnly ? tEta("warnings.warn_only_notice") : null;

  return {
    connStatus, blockPolicy, canIssue, isConnected, isDisconnectedOrError,
    connectEntrypoints: flags?.connect_entrypoints ?? [],
    etaHardBlocked, etaWarnOnly, draftBlocked, etaNoticeTone, etaNoticeText,
  };
}
