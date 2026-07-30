import { beforeEach, describe, expect, it } from "vitest";
import { usePlayChecks } from "./playChecks";
import type { Check, Product } from "@/features/play/types";

const juice: Product = { id: "prd_juice", name_ar: "عصير", name_en: "Juice", price: 12, has_bom: true };
const pepsi: Product = { id: "prd_pepsi", name_ar: "بيبسي", name_en: "Pepsi", price: 15, has_bom: false };

function seedCheck(): Check {
  return { id: "chk_test", session_id: "ses_test", cafeteria_lines: [] };
}

describe("usePlayChecks — addCafeteriaLine (§5.4)", () => {
  beforeEach(() => {
    usePlayChecks.setState({ checks: { chk_test: seedCheck() } });
  });

  it("adds a new line for a product not yet on the check", () => {
    usePlayChecks.getState().addCafeteriaLine("chk_test", pepsi);
    const check = usePlayChecks.getState().checks.chk_test;
    expect(check.cafeteria_lines).toHaveLength(1);
    expect(check.cafeteria_lines[0]).toMatchObject({ product_id: "prd_pepsi", qty: 1, unit_price: 15, line_total: 15 });
  });

  it("increments qty/line_total when the same product is tapped again", () => {
    usePlayChecks.getState().addCafeteriaLine("chk_test", pepsi);
    usePlayChecks.getState().addCafeteriaLine("chk_test", pepsi);
    const check = usePlayChecks.getState().checks.chk_test;
    expect(check.cafeteria_lines).toHaveLength(1);
    expect(check.cafeteria_lines[0].qty).toBe(2);
    expect(check.cafeteria_lines[0].line_total).toBe(30);
  });

  it("never blocks on has_bom — the line is added and simply stamped (flag-don't-block)", () => {
    usePlayChecks.getState().addCafeteriaLine("chk_test", juice);
    const check = usePlayChecks.getState().checks.chk_test;
    expect(check.cafeteria_lines).toHaveLength(1);
    expect(check.cafeteria_lines[0].has_bom).toBe(true);
  });

  it("does not stamp has_bom for a non-BOM product", () => {
    usePlayChecks.getState().addCafeteriaLine("chk_test", pepsi);
    const check = usePlayChecks.getState().checks.chk_test;
    expect(check.cafeteria_lines[0].has_bom).toBeUndefined();
  });

  it("is a no-op for an unknown check id", () => {
    usePlayChecks.getState().addCafeteriaLine("chk_missing", pepsi);
    expect(usePlayChecks.getState().checks.chk_missing).toBeUndefined();
  });
});

describe("usePlayChecks — closeCheck (§5.7)", () => {
  beforeEach(() => {
    usePlayChecks.setState({ checks: { chk_test: seedCheck() } });
  });

  it("flips closed to true", () => {
    usePlayChecks.getState().closeCheck("chk_test");
    expect(usePlayChecks.getState().checks.chk_test.closed).toBe(true);
  });

  it("is a no-op for an unknown check id", () => {
    usePlayChecks.getState().closeCheck("chk_missing");
    expect(usePlayChecks.getState().checks.chk_missing).toBeUndefined();
  });
});
