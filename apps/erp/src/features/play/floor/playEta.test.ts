import { describe, expect, it } from "vitest";
import { docTypeFor, simulateEta } from "./playEta";

describe("docTypeFor", () => {
  it("routes B2B (has TRN) to e_invoice and B2C to e_receipt", () => {
    expect(docTypeFor(true)).toBe("e_invoice");
    expect(docTypeFor(false)).toBe("e_receipt");
  });
});

describe("simulateEta", () => {
  it("flags a missing eta_code before checking connectivity — flag-don't-block", () => {
    const result = simulateEta({ hasTrn: false, isOnline: false, missingEtaCode: true });
    expect(result.syncStatus).toBe("flagged_missing_code");
    expect(result.channel).toBe("e_receipt");
  });

  it("queues with a 48h B2C window when offline", () => {
    const result = simulateEta({ hasTrn: false, isOnline: false, missingEtaCode: false });
    expect(result.syncStatus).toBe("queued");
    expect(result.window_remaining_hours).toBe(48);
    expect(result.window_deadline).toBeDefined();
    expect(new Date(result.window_deadline!).getTime()).toBeGreaterThan(new Date(result.queued_at!).getTime());
  });

  it("issues immediately (valid) when online with a complete eta_code", () => {
    const result = simulateEta({ hasTrn: true, isOnline: true, missingEtaCode: false });
    expect(result.syncStatus).toBe("valid");
    expect(result.channel).toBe("e_invoice");
    expect(result.uuid).toBeDefined();
    expect(result.accepted_at).toBeDefined();
  });
});
