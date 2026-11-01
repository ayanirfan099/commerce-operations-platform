import { describe, it, expect } from "vitest";

/**
 * Discount calculation logic (mirrors server-side validation in checkout).
 * These are pure functions that can be tested without a database.
 */

type Discount = {
  type: "PERCENTAGE" | "FIXED";
  value: number; // cents for FIXED, percent (0-100) for PERCENTAGE
  minSubtotal: number; // cents
};

function calculateDiscount(subtotal: number, d: Discount): number {
  if (subtotal < d.minSubtotal) return 0;
  if (d.type === "PERCENTAGE") {
    return Math.floor((subtotal * d.value) / 100);
  }
  return Math.min(d.value, subtotal);
}

function isDiscountValid(
  now: Date,
  d: { validFrom: Date; validTo: Date; usageLimit: number | null; usageCount: number; isActive: boolean }
): boolean {
  if (!d.isActive) return false;
  if (now < d.validFrom || now > d.validTo) return false;
  if (d.usageLimit !== null && d.usageCount >= d.usageLimit) return false;
  return true;
}

describe("discount calculation (rounding and boundaries)", () => {
  const percentage10: Discount = { type: "PERCENTAGE", value: 10, minSubtotal: 0 };
  const fixed500: Discount = { type: "FIXED", value: 500, minSubtotal: 0 };

  it("applies percentage discount with floor rounding", () => {
    expect(calculateDiscount(1000, percentage10)).toBe(100); // 10% of 1000
    expect(calculateDiscount(999, percentage10)).toBe(99); // floor(99.9) = 99
    expect(calculateDiscount(1, percentage10)).toBe(0); // floor(0.1) = 0
  });

  it("applies fixed discount capped at subtotal", () => {
    expect(calculateDiscount(1000, fixed500)).toBe(500);
    expect(calculateDiscount(300, fixed500)).toBe(300); // capped at subtotal
    expect(calculateDiscount(0, fixed500)).toBe(0);
  });

  it("enforces minimum subtotal", () => {
    expect(calculateDiscount(900, { ...percentage10, minSubtotal: 1000 })).toBe(0);
    expect(calculateDiscount(1000, { ...percentage10, minSubtotal: 1000 })).toBe(100);
    expect(calculateDiscount(1500, { ...percentage10, minSubtotal: 1000 })).toBe(150);
  });

  it("returns zero discount for empty cart", () => {
    expect(calculateDiscount(0, percentage10)).toBe(0);
    expect(calculateDiscount(0, fixed500)).toBe(0);
  });
});

describe("discount validity (boundary dates and usage)", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("is valid within the date window", () => {
    expect(
      isDiscountValid(now, {
        validFrom: new Date(Date.UTC(2026, 0, 1)),
        validTo: new Date(Date.UTC(2026, 11, 31)),
        usageLimit: null,
        usageCount: 0,
        isActive: true,
      })
    ).toBe(true);
  });

  it("is invalid before validFrom", () => {
    expect(
      isDiscountValid(now, {
        validFrom: new Date(Date.UTC(2026, 6, 1)),
        validTo: new Date(Date.UTC(2026, 11, 31)),
        usageLimit: null,
        usageCount: 0,
        isActive: true,
      })
    ).toBe(false);
  });

  it("is invalid after validTo", () => {
    expect(
      isDiscountValid(now, {
        validFrom: new Date(Date.UTC(2026, 0, 1)),
        validTo: new Date(Date.UTC(2026, 5, 1)),
        usageLimit: null,
        usageCount: 0,
        isActive: true,
      })
    ).toBe(false);
  });

  it("is valid exactly on validFrom and validTo boundaries", () => {
    // Use Date.UTC to avoid local timezone offset issues.
    const validFrom = new Date(Date.UTC(2026, 0, 1));
    const validTo = new Date(Date.UTC(2026, 11, 31, 23, 59, 59));

    expect(
      isDiscountValid(validFrom, {
        validFrom,
        validTo,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
      })
    ).toBe(true);

    const validToEnd = new Date(Date.UTC(2026, 11, 31, 23, 59, 59));
    expect(
      isDiscountValid(validToEnd, {
        validFrom,
        validTo,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
      })
    ).toBe(true);
  });

  it("is invalid when inactive", () => {
    expect(
      isDiscountValid(now, {
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        usageLimit: null,
        usageCount: 0,
        isActive: false,
      })
    ).toBe(false);
  });

  it("is invalid when usage limit reached", () => {
    expect(
      isDiscountValid(now, {
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        usageLimit: 5,
        usageCount: 5,
        isActive: true,
      })
    ).toBe(false);
  });

  it("is valid when usage limit not reached", () => {
    expect(
      isDiscountValid(now, {
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        usageLimit: 5,
        usageCount: 4,
        isActive: true,
      })
    ).toBe(true);
  });

  it("is valid when usage limit is null (unlimited)", () => {
    expect(
      isDiscountValid(now, {
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        usageLimit: null,
        usageCount: 1000,
        isActive: true,
      })
    ).toBe(true);
  });
});
