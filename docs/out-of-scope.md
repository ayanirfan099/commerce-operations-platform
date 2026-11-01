# Out of scope — CommerceOps v1

The following are explicitly excluded from the initial release scope:

- **Real payments / live Stripe mode.** Stripe test mode only; no real cards, charges or payouts.
- **Production deployment.** No production infrastructure is provisioned or claimed. Deployment is documented but not overstated.
- **Multi-currency and multi-region.** Single currency, single locale in v1.
- **Subscriptions and recurring billing.** One-time purchases only.
- **Marketplace / multi-vendor.** Single shop catalogue only.
- **Customer reviews, wishlists, gift cards, loyalty points.** Not part of v1.
- **Advanced promotions.** Buy-one-get-one, bundled discounts, coupon stacking beyond the bounded v1 discount-code model are out of scope.
- **Email/SMS notifications.** Order confirmation is rendered in-app; no out-of-band notifications in v1.
- **Search backend.** Catalogue search is database-backed; no dedicated search service.
- **Returns and exchanges.** Refund records exist as a data model, but the returns workflow is out of scope.
- **Mobile native apps.** Web storefront and admin dashboard only (responsive).
- **S3 file storage in production builds.** Local storage adapter is the default; an S3-compatible adapter is documented but not implemented by default.
- **Real customer or sales data.** Seed data is fictional and deterministic.

If any of these are required post-v1, they will be tracked as separate milestones with their own specifications.