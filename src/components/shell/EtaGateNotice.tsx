import { Alert } from "@/components/ui/alert";
import type { EtaGate } from "@/hooks/useEtaGate";

interface EtaGateNoticeProps {
  gate: Pick<EtaGate, "etaNoticeText" | "etaNoticeTone">;
  onConnect: () => void;
  connectLabel: string;
}

/**
 * The connector notice shown at the top of a document's readiness panel —
 * pulled out of InvoiceEditorPage so the /dev ETA playground can render the
 * exact same markup instead of a hand-copied approximation that could drift.
 */
export function EtaGateNotice({ gate, onConnect, connectLabel }: EtaGateNoticeProps) {
  if (!gate.etaNoticeText) return null;
  return (
    <Alert variant={gate.etaNoticeTone} title={gate.etaNoticeText}>
      <button type="button" onClick={onConnect} className="underline underline-offset-2">
        {connectLabel}
      </button>
    </Alert>
  );
}
