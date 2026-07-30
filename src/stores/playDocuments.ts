import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlayEtaChannel, PlayEtaResult } from "@/features/play/floor/playEta";

export interface PlayDocumentLine {
  /** Device name for a time line, or the product's own name for a cafeteria line. */
  label: string;
  qty: number;
  unit_price: number;
  line_total: number;
  _flag?: "missing_eta_code";
}

export interface PlayDocument {
  id: string;
  session_id: string;
  type: PlayEtaChannel;
  lines: PlayDocumentLine[];
  time_total: number;
  cafeteria_total: number;
  grand_total: number;
  eta: PlayEtaResult;
  tender: Record<string, number>;
  payment_status: "paid" | "credit";
  posted: boolean;
  issued_at: string;
}

/** Cancel (§5.9) — a reversal posted against whichever receipt/document had already been
 * issued for the session (a prepaid session's `prepaid_receipt_id` from its pay-to-start
 * step, or a rarer already-issued `document_id`). Reversal-not-delete: the original document
 * is never touched or removed, this is a standalone record referencing it. */
export interface PlayReversal {
  id: string;
  session_id: string;
  reversed_ref: string;
  reason: string;
  issued_at: string;
}

let seq = 1;
export function nextDocumentId(): string {
  return `doc_play_${Date.now()}_${seq++}`;
}

let rseq = 1;
/** "cn_" prefix mirrors the fixtures' own convention for a reversal id (`cn_play_0002` on the
 * seeded cancelled/reversed session, §11) — a credit-note-style reference, distinct from a
 * regular issued document's `doc_play_` id. */
export function nextReversalId(): string {
  return `cn_play_${Date.now()}_${rseq++}`;
}

interface PlayDocumentsState {
  documents: Record<string, PlayDocument>;
  reversals: Record<string, PlayReversal>;
  /** Files the final End & Bill document (§5.7) — mirrors `useRprWorkOrders`'
   * `finalDocuments`/`deliverWorkOrder` shape: a separate store keyed by document id, since
   * `Session.document_id` is only ever a reference, not the document itself. */
  fileDocument: (doc: PlayDocument) => void;
  /** Files a cancellation reversal (§5.9). Separate map from `documents` since a reversal
   * isn't itself a channel-routed e-invoice/e-receipt — it has no `PlayEtaResult` of its own. */
  fileReversal: (reversal: PlayReversal) => void;
}

export const usePlayDocuments = create<PlayDocumentsState>()(
  persist(
    (set) => ({
      documents: {},
      reversals: {},
      fileDocument: (doc) => set((s) => ({ documents: { ...s.documents, [doc.id]: doc } })),
      fileReversal: (reversal) => set((s) => ({ reversals: { ...s.reversals, [reversal.id]: reversal } })),
    }),
    { name: "flexova.play.documents" }
  )
);
