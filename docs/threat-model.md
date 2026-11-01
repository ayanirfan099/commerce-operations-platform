# Payment and operations threat model

**Scope:** CommerceOps v1 (storefront, checkout, inventory, admin).  
**Environment:** Stripe test mode only; no real charges. All products, customers and data fictional.

## 1. Threats and mitigations

| # | Threat | Asset at risk | Mitigation |
|---|--------|---------------|------------|
| T1 | **Price tampering** — client sends a lower amount or manipulated line totals at checkout | Revenue integrity | Prices loaded server-side from the database at checkout; client amounts ignored; order items snapshot price at purchase |
| T2 | **Webhook forgery** — attacker posts a fake `payment.succeeded` webhook | Order fulfilment without payment | Stripe webhook signatures verified before any processing; fake provider used in tests; synthetic-payload signature tests |
| T3 | **Webhook replay** — same webhook delivered multiple times | Duplicate fulfilment / double credit | Webhook event IDs stored; events processed once; idempotent checkout and payment handling |
| T4 | **Inventory race** — two concurrent buyers purchase the final unit | Overselling, negative stock | Reservations and order creation in DB transactions; `SELECT ... FOR UPDATE`-style locking via Prisma transactions; concurrency test with two buyers for final stock |
| T5 | **Reservation leakage** — abandoned checkouts hold stock forever | Available inventory | Reservations have expiry; released on failed/expired checkout; committed on successful payment |
| T6 | **Admin abuse** — unauthorized product/price/inventory or order state changes | Catalogue and order integrity | Centralized role checks on all admin routes; every admin action audited (actor + action + target) |
| T7 | **Discount abuse** — expired/overused or out-of-scope codes applied | Promotion budget | Server-side validation of date window, minimum subtotal, usage limit and product/category scope |
| T8 | **Credential leakage** — Stripe keys or DB credentials committed | Payment system compromise | `.env` and `*.pem`/`*.key` ignored; no secrets in repo; CI uses test-mode mocks only; secret scanning enabled |
| T9 | **Unsafe uploads** — malicious or oversized files via image upload | Server integrity | Allowed MIME types, size caps, randomized object keys, local adapter (documented S3-compatible adapter) |
| T10 | **Open redirect** — attacker-controlled redirect URL after checkout/payment | Phishing | Redirect URLs come from trusted server configuration only |

## 2. What is verified in local mode

- Deterministic fake provider covers succeeded/failed payment paths and idempotent checkout.
- Order state transitions, including invalid-transition rejection, are unit-tested.
- Discount rounding, date-window boundaries and usage limits are unit-tested.
- Inventory reservation/expiry and the two-buyer final-stock race are integration-tested.
- Webhook signature verification is tested with synthetic payloads (no Stripe network).
- Admin authorization and upload validation are tested.

## 3. What is NOT verified in local mode

- Live Stripe connectivity (test-mode adapter exists, but CI does not call Stripe).
- Real card processing, refunds at a provider, or webhook delivery from Stripe servers.
- Production infrastructure: TLS termination, WAF, production secret management, load behavior.
- Production-grade fraud tools (Stripe Radar etc.) — out of v1 scope.

## 4. Assumptions

- Single PostgreSQL instance provides transactional correctness for inventory and orders.
- Admin access is limited to known, invited users; self-registration as admin is not supported.