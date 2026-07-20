# Fore Genomics Parent Portal (Health Hub)

The back office and parent account hub at `healthhub.foregenomics.com` — billing,
orders, kits, consents, onboarding, report delivery, and admin/counselor tooling.
Parents' interactive results live in **Fore Explore** (separate repo/app, see
`EXPLORE_INTEGRATION.md`); the Health Hub is the system of record it reads from.

**Stack:** Next.js 14 (App Router, `src/`), Clerk (auth, shared session across
`foregenomics.com` subdomains), Prisma + Postgres, Google Cloud Storage (reports,
genomes), Stripe + Shopify (purchase), Klaviyo (lifecycle email), Calendly
(counseling), Vercel (hosting, crons, `vercel-build` runs `prisma migrate deploy`).

## Getting started

```bash
npm install            # postinstall runs prisma generate
vercel pull            # env vars for local dev
npm run dev            # http://localhost:3000
npx prisma migrate dev # apply migrations locally
```

## How an order moves

`OrderStatus` pipeline: `ORDER_RECEIVED → ONBOARDING_COMPLETED → PREPARING_ORDER →
SHIPPED_TO_USER → DELIVERED_AWAITING_RETURN → SHIPPED_TO_LAB → RECEIVED_IN_PROCESS →
COMPLETE_*` (plus `RESAMPLE_REQUIRED`, `ORDER_CANCELED`).

**All status changes flow through `applyOrderStatusTransition()` in
`src/lib/order-status-service.ts`** — the single place that persists the change and
fires the audit log, Klaviyo stage events, the admin notification email, and the
Slack #orders post. Callers:

- Admin UI (`src/app/actions.ts` → order detail page), including the *silent update*
  option that suppresses all notifications for back-office cleanup.
- **FedEx tracking automation** (`src/lib/fedex/`) — advances shipping statuses
  automatically from FedEx scan events; see `FEDEX_TRACKING.md`.

Do not write `Order.status` with raw Prisma — you'd silently skip parent emails and
the audit trail. (Exception: the onboarding routes set the two pre-shipping statuses
inline as part of their own flows; consolidating them is tracked in the refactor
backlog.)

## Key services (`src/lib/`)

| Service | Role |
| --- | --- |
| `order-status-service.ts` | THE status-transition path (audit + Klaviyo + email + Slack) |
| `fedex/` | FedEx webhook/poller rule engine — `FEDEX_TRACKING.md` |
| `klaviyo.ts` | Event helpers; wiring documented in `KLAVIYO_FLOWS.md` |
| `order-service.ts` / `stripe-order-service.ts` | Order reads / creation from Stripe checkout |
| `audit-service.ts` | `AuditLog` writes (who did what, per order) |
| `email-service.ts` | SMTP admin + parent notifications |
| `slack.ts` | PHI-free #orders channel posts (status changes, FedEx exceptions) |
| `report-storage.ts` / `genome-storage.ts` / `google-storage.ts` | GCS files (reports, VCFs) |
| `consent-service.ts` / `trf-service.ts` / `counselor-*` | Consents, TRFs, counselor tooling |

## Scheduled jobs (Vercel Cron → `src/app/api/public/cron/*`)

| Path | Schedule | Purpose |
| --- | --- | --- |
| `daily-counselor-notifications` | 09:00 UTC | Counselor digest |
| `automation-health-check` | 08:00/20:00 UTC | Emails admins if automations look broken |
| `fedex-poll` | every 30 min | Polls FedEx for open orders' tracking numbers |

All secured with `CRON_SECRET` bearer auth. ⚠️ Vercel Cron invokes with **GET** — the
older two routes only export `POST` and may never have fired from Vercel's scheduler;
`fedex-poll` exports both. (Flagged in the 2026-07-20 refactor audit.)

## Webhooks (`src/app/api/webhooks/*`)

`stripe` (checkout → order creation), `clerk` (user lifecycle → Klaviyo),
`shopify` (order placed), `calendly` (counseling bookings),
`fedex` (tracking events → automatic status advance, `FEDEX_TRACKING.md`).

## Docs index

- `FEDEX_TRACKING.md` — shipping automation: rules, setup, the Inocras ask
- `KLAVIYO_FLOWS.md` — which events fire when + Klaviyo flow rebuild plan
- `EXPLORE_INTEGRATION.md` — how Fore Explore reads children/genomes from here

## Working notes (pre-existing scratch, kept verbatim)

Retests Reaedy -> DNA + collection Kit

- #1 results get from PDF, get results
- can upload VCf, PDF, reads from inocras file
- Guardrails and safeguards. How the product protects families and us: the consent and identity gate (subscribe, learn, consent, sign), guardianship attestation and MFA, the two-doors separation, how adult-onset content is handled, the evidence tiers, the limits on Ask Fore, and the research-use wellness framing.: this is a separate product and this is used to be as a explorer product and consent
- Document what we do programmatically at the engineering level, what compliance, how its HIPAA compliant, policies, etc.
- Pizza tracker showed initially,
- User Groups for parent response,
- Python
