# M0 — Product requirements and scope

**Product:** CommerceOps — E-commerce & Inventory Platform  
**Owner:** `ayanirfan099` — repository `commerce-operations-platform`  
**Status:** Specification (M0). No implementation yet.

## 1. Product summary

A bounded e-commerce and operations platform with two distinct surfaces:

- **Customer storefront:** editorial, spacious, product-focused — catalogue, filtering, search, product details, cart, checkout review, order confirmation, account order history.
- **Operations dashboard:** compact, data-oriented — product/SKU/category management, image management, inventory adjustments and ledger, orders with state transitions, discount codes, sales/inventory summaries, customer records, audit log.

All data is fictional. Stripe test mode only; no real charges.

## 2. Minimum domain entities

User, Address, Category, Product, ProductVariant (SKU), ProductImage, Price, InventoryLocation, InventoryLedgerEntry, InventoryReservation, Cart, CartItem, DiscountCode, Order, OrderItem, PaymentAttempt, WebhookEvent, RefundRecord, AuditEvent.

## 3. Customer storefront requirements

- Responsive home and catalogue pages.
- Categories, filtering, sorting and search.
- Product and variant detail pages with accessible image gallery.
- Stock status shown without leaking sensitive on-hand counts unless intentionally designed.
- Persistent, server-aware cart; guest cart with safe merge on login.
- Checkout review with server-authoritative pricing.
- Order confirmation and account order history.
- Loading, empty and error states throughout.

## 4. Checkout and payments

Implement a `PaymentProvider` interface with:

- Deterministic fake provider for development and tests.
- Stripe test-mode adapter (network boundary mocked in tests).
- Server-created checkout/payment session.
- Trusted server pricing and discount validation.
- Idempotency keys on checkout and payment operations.
- Signed webhook processing with signature verification before handling.
- Retry-safe event handling; webhook event IDs stored and processed once.
- Payment states: succeeded, failed, refunded.
- No real payment credentials in repository or CI.

Documentation states exactly what is and is not verified in local mode.

## 5. Inventory

- Inventory ledger with reason and actor for every adjustment.
- Reservations with expiry.
- Release reservation on failed or expired checkout.
- Commit reservation on successful payment.
- Prevent negative available inventory under concurrent requests.
- Low-stock thresholds.
- Inventory history and CSV export.
- Tests simulating concurrent purchase attempts for the final unit of stock.

## 6. Orders

Explicit state machine: `pending_payment → paid → processing → fulfilled`, with `cancelled` and `refunded` terminal/alternate paths. Invalid transitions rejected. Every transition records who/what caused it.

## 7. Admin dashboard

- Role-protected admin area with centralized role checks.
- Product, category and SKU management.
- Image management through a safe local adapter (validated types/sizes, randomized keys).
- Inventory adjustment and ledger view.
- Orders with filters and state transitions.
- Discount-code management.
- Sales and inventory summaries computed from actual seed/order data.
- Customer records limited to required fields.
- Audit log of admin operations.

## 8. Promotions (bounded v1)

- Percentage or fixed discount.
- Date window, minimum subtotal, usage limit.
- Optional product or category scope.
- Server-side validation.
- Tests for rounding and boundary dates.

## 9. Security and privacy

- HTTP-only secure sessions; CSRF-aware writes.
- Strict authorization on admin routes.
- Input validation and output encoding.
- Rate limits on login, checkout and discount attempts.
- Safe uploads: allowed types, size limits, randomized object keys.
- No card data stored or logged; no sensitive bodies in logs.
- Structured logs with request and order IDs.
- Privacy-friendly fictional seed data.
- Dependency and secret scanning in CI.
- Threat model covering price tampering, webhook forgery, inventory races and admin abuse.

## 10. Design direction

- Original fictional brand and locally created assets; no copying of an existing retailer's brand, photography or copy.
- Accessible forms, keyboard navigation, visible focus states, reduced motion support, mobile checkout, robust errors.

## 11. Required tests (minimum)

- Server-authoritative prices at checkout.
- Discount rounding and usage/date limits.
- Order state transitions and invalid-transition rejection.
- Idempotent checkout and webhook replay.
- Invalid webhook signature rejection.
- Inventory reservation and expiry.
- Two concurrent buyers competing for final stock.
- Guest cart merge on login.
- Admin authorization.
- Upload validation (type, size, key randomization).
- Full Playwright fake-provider checkout journey.

## 12. Out of scope (v1)

See [`docs/out-of-scope.md`](docs/out-of-scope.md).

## 13. Definition of done (per milestone)

- Clean checkout via documented commands.
- Real PostgreSQL persistence with Prisma migrations.
- Deterministic fictional seed data.
- Customer and admin workflows function.
- Transactional/idempotency tests pass.
- No real payments or secrets committed.
- Green CI and production build.
- README shows screenshot, architecture, quick start, test-mode explanation and limitations.
- Deployment documented but not overstated; ask before tagging `v1.0.0`.