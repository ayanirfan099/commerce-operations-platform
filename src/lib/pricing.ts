/**
 * Server-authoritative pricing utilities.
 *
 * Prices are always loaded from the database; client-supplied amounts are
 * never trusted. These functions are pure and easily unit-tested.
 */

export type PriceLine = {
  variantId: string;
  name: string;
  sku: string;
  unitPrice: number; // cents
  quantity: number;
};

/** Recompute cart totals from database prices (single source of truth). */
export function computeCartTotal(lines: PriceLine[]): { subtotal: number; total: number } {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  return { subtotal, total: subtotal };
}

/** Format cents as a dollars string. */
export function formatCents(amount: number): string {
  return (amount / 100).toFixed(2);
}
