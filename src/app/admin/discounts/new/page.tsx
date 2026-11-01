import { requireAdmin } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewDiscountPage() {
  await requireAdmin();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/discounts" className="text-sm text-admin-accent hover:underline">
          ← Back to discounts
        </Link>
        <h1 className="text-2xl font-bold text-admin-ink">Add Discount Code</h1>
      </div>

      <div className="card">
        <form action="/api/admin/discounts" method="POST" className="space-y-4">
          <div>
            <label htmlFor="code" className="label">
              Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              className="input"
              placeholder="e.g. WELCOME10"
              maxLength="32"
            />
            <p className="text-xs text-muted mt-1">
              Codes are stored uppercase and matched case-insensitively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="label">
                Type
              </label>
              <select id="type" name="type" className="input">
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </div>

            <div>
              <label htmlFor="value" className="label">
                Value
              </label>
              <input
                id="value"
                name="value"
                type="number"
                step="0.01"
                min="0"
                required
                className="input"
                placeholder="0.00"
              />
              <p className="text-xs text-muted mt-1">
                Percent (0-100) or fixed amount in USD.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="minSubtotal" className="label">
              Minimum Subtotal (USD)
            </label>
            <input
              id="minSubtotal"
              name="minSubtotal"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="validFrom" className="label">
                Valid From
              </label>
              <input
                id="validFrom"
                name="validFrom"
                type="datetime-local"
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="validTo" className="label">
                Valid To
              </label>
              <input
                id="validTo"
                name="validTo"
                type="datetime-local"
                required
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="usageLimit" className="label">
              Usage Limit
            </label>
            <input
              id="usageLimit"
              name="usageLimit"
              type="number"
              min="1"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              Leave blank for unlimited uses.
            </p>
          </div>

          <button type="submit" className="btn-primary">
            Create Discount
          </button>
        </form>
      </div>
    </div>
  );
}
