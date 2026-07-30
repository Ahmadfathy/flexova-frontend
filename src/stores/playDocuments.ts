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

let seq = 1;
export function nextDocumentId(): string {
  return `doc_play_${Date.now()}_${seq++}`;
}

interface PlayDocumentsState {
  documents: Record<string, PlayDocument>;
  /** Files the final End & Bill document (§5.7) — mirrors `useRprWorkOrders`'
   * `finalDocuments`/`deliverWorkOrder` shape: a separate store keyed by document id, since
   * `Session.document_id` is only ever a reference, not the document itself. */
  fileDocument: (doc: PlayDocument) => void;
}

export const usePlayDocuments = create<PlayDocumentsState>()(
  persist(
    (set) => ({
      documents: {},
      fileDocument: (doc) => set((s) => ({ documents: { ...s.documents, [doc.id]: doc } })),
    }),
    { name: "flexova.play.documents" }
  )
);
