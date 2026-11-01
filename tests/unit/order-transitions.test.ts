import { describe, it, expect } from "vitest";
import { isValidTransition, type OrderStatus } from "@/lib/orders";

describe("order state machine", () => {
  const validTransitions: Array<[OrderStatus, OrderStatus]> = [
    ["PENDING_PAYMENT", "PAID"],
    ["PENDING_PAYMENT", "CANCELLED"],
    ["PAID", "PROCESSING"],
    ["PAID", "CANCELLED"],
    ["PAID", "REFUNDED"],
    ["PROCESSING", "FULFILLED"],
    ["PROCESSING", "CANCELLED"],
    ["FULFILLED", "REFUNDED"],
  ];

  const invalidTransitions: Array<[OrderStatus, OrderStatus]> = [
    ["PENDING_PAYMENT", "PROCESSING"],
    ["PENDING_PAYMENT", "FULFILLED"],
    ["PENDING_PAYMENT", "REFUNDED"],
    ["PAID", "FULFILLED"],
    ["PROCESSING", "PAID"],
    ["PROCESSING", "REFUNDED"],
    ["FULFILLED", "PAID"],
    ["FULFILLED", "PROCESSING"],
    ["CANCELLED", "PAID"],
    ["CANCELLED", "PROCESSING"],
    ["CANCELLED", "FULFILLED"],
    ["CANCELLED", "REFUNDED"],
    ["REFUNDED", "PAID"],
    ["REFUNDED", "PROCESSING"],
    ["REFUNDED", "FULFILLED"],
    ["REFUNDED", "CANCELLED"],
  ];

  it("allows valid transitions", () => {
    for (const [from, to] of validTransitions) {
      expect(isValidTransition(from, to)).toBe(true);
    }
  });

  it("rejects invalid transitions", () => {
    for (const [from, to] of invalidTransitions) {
      expect(isValidTransition(from, to)).toBe(false);
    }
  });

  it("treats terminal states as having no outgoing transitions", () => {
    expect(isValidTransition("CANCELLED", "PAID")).toBe(false);
    expect(isValidTransition("REFUNDED", "PAID")).toBe(false);
    expect(isValidTransition("CANCELLED", "CANCELLED")).toBe(false);
    expect(isValidTransition("REFUNDED", "REFUNDED")).toBe(false);
  });
});
