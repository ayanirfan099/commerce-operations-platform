# Deployment Guide — CommerceOps

This document describes how to deploy CommerceOps to production and the
production-gap checklist for the v1 release candidate.

> CommerceOps is a portfolio-grade reference application. It is not a hosted
> service, and no production deployment is implied or claimed by this
> repository. Deploy at your own risk after reviewing the gaps below.

## 1. Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (optional, for background jobs/reservation expiry workers)
- A domain with TLS termination (HTTPS required in production)

## 2. Environment variables

Copy `.env.example` to `.env` and set the following values. **Never commit `.env`.**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/commerceops` |
| `SESSION_SECRET` | Signing key for session cookies | `openssl rand -base64 32` |
| `APP_URL` | Public base URL of the app | `https://commerceops.example.com` |
| `STRIPE_SECRET_KEY` | Stripe test/live secret key | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `WEBHOOK_SECRET` | Shared secret for fake-provider webhooks (dev only) | `dev-webhook-secret` |

## 3. Local development with Docker Compose

```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed fictional data
npm run db:seed

# Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`. PostgreSQL is available at
`localhost:5432`, Redis at `localhost:6379`.

## 4. Production build

```bash
npm install --omit=dev
npm run db:generate
npm run build
npm start
```

Set `NODE_ENV=production` to enable secure cookies, error suppression, and
production logging.

## 5. Database migrations

Migrations live in `prisma/migrations/`. Apply them before starting the app:

```bash
npx prisma migrate deploy
```

Seed data (`prisma/seed.ts`) is fictional and deterministic. Run it only in
non-production environments:

```bash
npm run db:seed
```

## 6. Production-gap checklist

The following items are **not implemented** in v1 and must be addressed before
any production deployment:

| Area | Gap | Recommended action |
|------|-----|--------------------|
| **Payments** | Stripe integration is test-mode only | Obtain live Stripe keys, configure webhook endpoints, enable Radar/fraud tools |
| **Authentication** | Session-based auth; no MFA, no social login, no password reset flow | Add MFA, OAuth providers, secure password reset |
| **Infrastructure** | No TLS termination, WAF, or rate-limiting at the edge | Deploy behind a reverse proxy (nginx/Cloudflare) with TLS |
| **Secrets** | `.env` injected at deploy time | Use a secret manager (AWS Secrets Manager, HashiCorp Vault) |
| **File uploads** | Local storage adapter only | Implement the documented S3-compatible adapter |
| **Background jobs** | Redis/BullMQ placeholder only | Implement reservation expiry workers and email/SMS jobs |
| **Observability** | Structured logs only; no metrics or tracing | Add Prometheus metrics, OpenTelemetry tracing, error alerting |
| **Backups** | No database backup strategy | Configure automated PostgreSQL backups and point-in-time recovery |
| **Search** | Database-backed catalogue search only | Add a dedicated search service if needed |
| **Email/SMS** | No out-of-band notifications | Integrate an email/SMS provider for order confirmations |
| **CI/CD** | GitHub Actions workflow present; no deployment pipeline | Add automated deployments to staging/production |
| **Accessibility** | Reviewed but not formally audited | Conduct an WCAG 2.1 AA accessibility audit |
| **Security scanning** | Dependency/secret scanning noted in CI | Enable Dependabot, code scanning, and secret scanning on the repo |

## 7. Security notes

- Never enable real charges without reviewing the threat model
  ([`docs/threat-model.md`](docs/threat-model.md)).
- Stripe webhook signatures must be verified before processing.
- Admin operations require role checks and audit records.
- No card data is stored or logged.

## 8. Clean-checkout verification

Before tagging `v1.0.0`, confirm the following:

- [ ] `git status` is clean
- [ ] `npm install` succeeds
- [ ] `npm run lint` passes with no errors
- [ ] `npm run typecheck` passes (requires `@prisma/client` generated)
- [ ] `npm test` passes (44 tests across 8 files)
- [ ] `npx prisma migrate deploy` applies cleanly against a test database
- [ ] `npm run db:seed` loads deterministic fictional data
- [ ] `docker compose up -d postgres redis` starts without errors
- [ ] Customer storefront: catalogue, product detail, cart, checkout
- [ ] Admin dashboard: products, inventory, discounts, audit log
- [ ] Fake-provider purchase journey completes end-to-end

## 9. Release

Ask before creating the `v1.0.0` tag. Once approved:

```bash
git tag v1.0.0
git push origin v1.0.0
```
