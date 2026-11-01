import { describe, it, expect } from "vitest";
import { computeCartTotal, formatCents } from "@/lib/pricing";

describe("computeCartTotal (server-authoritative pricing)", () => {
  it("sums line totals from unit price and quantity", () => {
    const lines = [
      { variantId: "v1", name: "Mug", sku: "MUG-001", unitPrice: 1200, quantity: 2 },
      { variantId: "v2", name: "Board", sku: "BOARD-001", unitPrice: 3200, quantity: 1 },
    ];
    const result = computeCartTotal(lines);
    expect(result.subtotal).toBe(1200 * 2 + 3200 * 1); // 5600
    expect(result.total).toBe(5600);
  });

  it("returns zero for an empty cart", () => {
    expect(computeCartTotal([])).toEqual({ subtotal: 0, total: 0 });
  });

  it("handles a single item", () => {
    expect(computeCartTotal([{ variantId: "v1", name: "X", sku: "X-1", unitPrice: 500, quantity: 3 }])).toEqual({
      subtotal: 1500,
      total: 1500,
    });
  });
});

describe("formatCents", () => {
  it("formats cents to dollars", () => {
    expect(formatCents(1200)).toBe("12.00");
    expect(formatCents(5600)).toBe("56.00");
    expect(formatCents(0)).toBe("0.00");
    expect(formatCents(1)).toBe("0.01");
  });
});
