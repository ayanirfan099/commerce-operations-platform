# CommerceOps — E-commerce & Inventory Platform

**Status:** M0 specification complete — implementation proceeds through documented milestones and reviewed pull requests.

CommerceOps is a bounded, portfolio-grade e-commerce and operations platform: a customer storefront, server-authoritative cart/checkout, orders, an inventory ledger with reservations, and a role-protected admin dashboard. It is built with Next.js (App Router), TypeScript, PostgreSQL (Prisma), Tailwind CSS, Vitest/Testing Library, Playwright and GitHub Actions. Stripe is integrated in test mode only behind a swappable `PaymentProvider` interface, with a deterministic fake provider for development and tests.

> **Fictional project.** All products, brands, customers and order data are fictional. No real payments, real credentials or live business claims are involved.

---

## Planned delivery (milestones)

| Milestone | Scope |
|-----------|-------|
| **M0** | Specification and threat model (this repo state) |
| **M1** | Foundation and catalogue: Next.js scaffold, Prisma/PostgreSQL, auth and roles, product/SKU schema, fictional seed data, storefront catalogue and product pages, CI/lint/typecheck/baseline tests |
| **M2** | Cart, checkout and orders: guest/authenticated carts, server price calculation, fake payment provider, order snapshots and state machine, idempotent checkout, Playwright purchase flow |
| **M3** | Inventory correctness: ledger, reservations and expiry, transactional updates, concurrency tests, low-stock dashboard, CSV export |
| **M4** | Stripe test adapter and administration: signed/idempotent webhooks, admin product/order/inventory tools, discount codes, audit logs, no external Stripe calls in tests |
| **M5** | Polish and release candidate: accessibility and responsive review, performance and image checks, screenshots/social preview, migration/seed/Docker verification, deployment guide and production-gap checklist |

One pull request per milestone, opened from `arena/bde18439-commerce-operations-platform`.

---

## Architecture

Integrated Next.js application:

```
src/
  app/              storefront, account, admin and route handlers (checkout, webhooks)
  modules/
    auth/           sessions, roles, authorization
    catalog/        categories, products, variants/SKUs, images
    cart/           guest and authenticated carts, merge on login
    checkout/       server-authoritative pricing, idempotent checkout
    inventory/      ledger, reservations, expiry, availability
    orders/         order state machine, snapshots
    payments/       PaymentProvider interface, fake provider, Stripe adapter
    promotions/     discount codes, validation, rounding
    reporting/      sales and inventory summaries from real data
  components/       storefront and admin UI components
  lib/              prisma client, logging, validation, uploads
prisma/             schema and migrations
workers/            optional background job placeholders
tests/              vitest, testing-library, playwright fixtures
```

Key invariants (enforced in code and tested):

1. Prices are loaded on the server at checkout; client amounts are never trusted.
2. Order items snapshot product name, SKU and price at purchase time.
3. Inventory changes are ledger entries; no unexplained direct counter edits.
4. Reservation and order creation run in database transactions.
5. Repeated checkouts and webhook replays are idempotent.
6. Stripe webhook signatures are verified before processing; event IDs stored and processed once.
7. Payment status transitions are explicit, validated and audited.
8. Redirect URLs come from trusted server configuration.
9. Admin operations require centralized role checks and audit records.

See [`docs/threat-model.md`](docs/threat-model.md) for the payment threat model and [`docs/data-model.md`](docs/data-model.md) for the entity model.

---

## Test-mode payments

CommerceOps never processes real charges:

- **Development/tests:** a deterministic fake `PaymentProvider` simulates succeeded/failed payments without a network.
- **Stripe:** a Stripe test-mode adapter exists behind the same interface. Tests mock Stripe at the network boundary; webhook-signature logic is tested separately with synthetic payloads.
- No Stripe secret keys, webhook signing secrets or other credentials are committed. Real credentials are injected only through environment variables at deploy time.

See [`docs/threat-model.md`](docs/threat-model.md) for what is and is not verified in local mode.

---

## Quick start (documented, to be implemented in M1–M5)

```bash
# Clone and install
git clone https://github.com/ayanirfan099/commerce-operations-platform.git
cd commerce-operations-platform
npm install

# Copy the example environment file and fill in values locally (never commit .env)
cp .env.example .env

# Database
npx prisma migrate dev
npx prisma db seed

# Run lint, typecheck and tests
npm run lint
npm run typecheck
npm test

# Dev server
npm run dev
```

Full commands, required environment variables, Docker Compose setup and the production-gap checklist are documented as each milestone lands.

---

## Limitations

- No production deployment exists; performance, uptime and conversion claims are not made.
- Seed data is fictional and deterministic; it is not real customer or sales data.
- Stripe integration is test-mode only and is not exercised against live Stripe in CI.
- File uploads use a local storage adapter by default; an S3-compatible adapter is documented but not required for the v1 scope.

---

## Security

Dependency and secret scanning run in CI. No card data is stored or logged, and no sensitive request bodies are logged. The threat model covers price tampering, webhook forgery, inventory races and admin abuse ([`docs/threat-model.md`](docs/threat-model.md)).

## License

UNLICENSED — private portfolio project. All rights reserved unless otherwise added later.